package general

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gosample/internal/activities/general"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// DynamicWorkflowState is returned by the "state" query for observability.
type DynamicWorkflowState struct {
	CurrentStepID  string   `json:"currentStepId"`
	StepResultIDs  []string `json:"stepResultIds"`
	DefinitionVersion string `json:"definitionVersion,omitempty"`
}

// DynamicWorkflowInput is the input to the dynamic workflow.
type DynamicWorkflowInput struct {
	Definition         []byte                 `json:"definition"`          // JSON workflow definition
	Input              interface{}            `json:"input"`               // Workflow input for references (type: "input")
	StartStepID        *string                `json:"startStepId,omitempty"`        // Resume: start from this step (Continue-As-New)
	InitialStepResults map[string]interface{} `json:"initialStepResults,omitempty"` // Resume: pre-populated step results
}

// DynamicWorkflow runs a workflow from a JSON definition: activities and conditions.
func DynamicWorkflow(ctx workflow.Context, input DynamicWorkflowInput) (interface{}, error) {
	if len(input.Definition) == 0 {
		return nil, nil
	}

	var def WorkflowDef
	dec := json.NewDecoder(bytes.NewReader(input.Definition))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&def); err != nil {
		return nil, err
	}
	if err := Validate(&def); err != nil {
		return nil, err
	}

	// Resolve start step and step results (normal start or resume from Continue-As-New)
	var startID string
	stepResults := make(map[string]interface{})
	if input.InitialStepResults != nil && input.StartStepID != nil && *input.StartStepID != "" {
		startID = *input.StartStepID
		if _, ok := def.Steps[startID]; !ok {
			return nil, fmt.Errorf("resume startStepId %q is not a key in steps", startID)
		}
		for k, v := range input.InitialStepResults {
			stepResults[k] = v
		}
	} else {
		// Validate() requires startStepId when steps exist
		if def.StartStepID != nil && *def.StartStepID != "" {
			startID = *def.StartStepID
		}
	}
	if startID == "" {
		return nil, nil
	}
	if err := CheckCycles(def.Steps, startID); err != nil {
		return nil, err
	}

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	currentID := startID
	var lastResult interface{}

	// Query handler for observability (current step and which steps have results)
	_ = workflow.SetQueryHandler(ctx, "state", func() (DynamicWorkflowState, error) {
		ids := make([]string, 0, len(stepResults))
		for k := range stepResults {
			ids = append(ids, k)
		}
		return DynamicWorkflowState{
			CurrentStepID:      currentID,
			StepResultIDs:      ids,
			DefinitionVersion: def.Version,
		}, nil
	})

	logger := workflow.GetLogger(ctx)

	for currentID != "" {
		step, ok := def.Steps[currentID]
		if !ok {
			break
		}
		logger.Info("dynamic workflow step", "stepId", currentID, "type", step.Type)

		switch step.Type {
		case StepTypeActivity:
			// Resolve this step's input only. Each activity has its own input; the result is
			// passed only to this activity and is not shared with any other activity.
			resolvedInput, err := ResolveInput(step.Input, input.Input, stepResults)
			if err != nil {
				return nil, err
			}
			inputBytes := general.MustMarshalInput(resolvedInput)

			opts := ao
			if step.TimeoutSeconds != nil && *step.TimeoutSeconds > 0 {
				opts.StartToCloseTimeout = time.Duration(*step.TimeoutSeconds) * time.Second
			}
			if step.RetryPolicy != nil && step.RetryPolicy.MaximumAttempts > 0 {
				opts.RetryPolicy = &temporal.RetryPolicy{
					MaximumAttempts: int32(step.RetryPolicy.MaximumAttempts),
				}
				if step.RetryPolicy.BackoffCoefficient > 0 {
					opts.RetryPolicy.BackoffCoefficient = step.RetryPolicy.BackoffCoefficient
				}
				if step.RetryPolicy.InitialIntervalSeconds > 0 {
					opts.RetryPolicy.InitialInterval = time.Duration(step.RetryPolicy.InitialIntervalSeconds) * time.Second
				}
				if step.RetryPolicy.MaximumIntervalSeconds > 0 {
					opts.RetryPolicy.MaximumInterval = time.Duration(step.RetryPolicy.MaximumIntervalSeconds) * time.Second
				}
			}
			actCtx := workflow.WithActivityOptions(ctx, opts)

			var resultBytes []byte
			err = workflow.ExecuteActivity(actCtx, general.Dispatch, step.Name, inputBytes).Get(ctx, &resultBytes)
			if err != nil {
				if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
					stepResults[currentID] = map[string]interface{}{ActivityErrorResultKey: true, "message": err.Error()}
					lastResult = stepResults[currentID]
					currentID = *step.OnFailureStepID
					continue
				}
				return nil, err
			}

			var result interface{}
			if len(resultBytes) > 0 {
				if err := json.Unmarshal(resultBytes, &result); err != nil {
					return nil, err
				}
			}
			stepResults[currentID] = result
			lastResult = result

			if step.NextStepID != nil && *step.NextStepID != "" {
				currentID = *step.NextStepID
			} else {
				currentID = ""
			}

		case StepTypeCondition:
			left, err := ResolveValueRef(step.Left, input.Input, stepResults)
			if err != nil {
				return nil, err
			}
			var right interface{}
			if step.Right != nil {
				right, err = ResolveValueRef(step.Right, input.Input, stepResults)
				if err != nil {
					return nil, err
				}
			}
			ok, err := EvaluateCondition(left, right, step.Operator)
			if err != nil {
				return nil, err
			}
			if ok {
				if step.ThenStepID != nil && *step.ThenStepID != "" {
					currentID = *step.ThenStepID
				} else {
					currentID = ""
				}
			} else {
				if step.ElseStepID != nil && *step.ElseStepID != "" {
					currentID = *step.ElseStepID
				} else {
					currentID = ""
				}
			}

		case StepTypeSignal:
			sigCh := workflow.GetSignalChannel(ctx, step.SignalName)
			timerFuture := workflow.NewTimer(ctx, time.Duration(step.SignalTimeoutSeconds)*time.Second)
			selector := workflow.NewSelector(ctx)

			var signalPayload []byte
			timedOut := false
			canceled := false
			selector.AddReceive(sigCh, func(c workflow.ReceiveChannel, more bool) {
				c.Receive(ctx, &signalPayload)
			})
			selector.AddFuture(timerFuture, func(f workflow.Future) {
				_ = f.Get(ctx, nil)
				timedOut = true
			})
			selector.AddReceive(ctx.Done(), func(c workflow.ReceiveChannel, more bool) {
				c.Receive(ctx, nil)
				canceled = true
			})
			selector.Select(ctx)

			if canceled {
				return nil, temporal.NewCanceledError("workflow canceled while waiting for signal")
			}
			if timedOut {
				stepResults[currentID] = map[string]interface{}{SignalTimeoutResultKey: true}
				lastResult = stepResults[currentID]
				resumeInput := DynamicWorkflowInput{
					Definition:         input.Definition,
					Input:              input.Input,
					StartStepID:        step.TimeoutStepID,
					InitialStepResults: stepResults,
				}
				return nil, workflow.NewContinueAsNewError(ctx, DynamicWorkflow, resumeInput)
			}

			var result interface{}
			if len(signalPayload) > 0 {
				if err := json.Unmarshal(signalPayload, &result); err != nil {
					// Graceful: store error so downstream can branch on invalid payload
					result = map[string]interface{}{ActivityErrorResultKey: true, "message": "invalid signal payload", "detail": err.Error()}
				}
			}
			stepResults[currentID] = result
			lastResult = result
			resumeInput := DynamicWorkflowInput{
				Definition:         input.Definition,
				Input:              input.Input,
				StartStepID:        step.NextStepID,
				InitialStepResults: stepResults,
			}
			return nil, workflow.NewContinueAsNewError(ctx, DynamicWorkflow, resumeInput)

		case StepTypeParallel:
			if len(step.BranchStepIDs) == 0 {
				return nil, fmt.Errorf("parallel step %q has no branchStepIds", currentID)
			}

			branchResults := make(map[string]interface{})
			branchErrors := make(map[string]error)

			// Execute branches in parallel using workflow.Go() and Futures
			type branchFuture struct {
				branchID string
				future   workflow.Future
			}

			futures := make([]branchFuture, 0, len(step.BranchStepIDs))
			for _, branchID := range step.BranchStepIDs {
				branchStep, exists := def.Steps[branchID]
				if !exists {
					return nil, fmt.Errorf("branchStepId %q not found", branchID)
				}

				// Create future for branch execution
				future, setResult := workflow.NewFuture(ctx)
				branchID := branchID // Capture for closure

				workflow.Go(ctx, func(ctx workflow.Context) {
					result, err := executeBranchChain(ctx, branchID, branchStep, def, input, stepResults, ao)
					setResult.Set(result, err)
				})

				futures = append(futures, branchFuture{branchID: branchID, future: future})
			}

			// Wait for completion based on join strategy
			if step.Join == JoinAll {
				// Wait for all branches to complete
				for _, bf := range futures {
					var result interface{}
					err := bf.future.Get(ctx, &result)
					if err != nil {
						branchErrors[bf.branchID] = err
						branchResults[bf.branchID] = map[string]interface{}{ActivityErrorResultKey: true, "message": err.Error()}
					} else {
						branchResults[bf.branchID] = result
					}
				}

				// Check if any branch failed
				if len(branchErrors) > 0 {
					if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
						stepResults[currentID] = branchResults
						lastResult = branchResults
						currentID = *step.OnFailureStepID
						continue
					}
					// Return aggregated error
					errMsgs := make([]string, 0, len(branchErrors))
					for bid, err := range branchErrors {
						errMsgs = append(errMsgs, fmt.Sprintf("%s: %v", bid, err))
					}
					return nil, fmt.Errorf("parallel step failed: [%s]", strings.Join(errMsgs, ", "))
				}
			} else if step.Join == JoinAny {
				// Wait for first branch to complete using selector
				selector := workflow.NewSelector(ctx)
				var firstCompleted branchFuture
				var completed bool

				for i := range futures {
					bf := &futures[i]
					selector.AddFuture(bf.future, func(f workflow.Future) {
						if !completed {
							completed = true
							firstCompleted = *bf
						}
					})
				}

				// Select until first completes
				for !completed {
					selector.Select(ctx)
				}

				// Get result from first completed branch
				var result interface{}
				err := firstCompleted.future.Get(ctx, &result)
				if err != nil {
					if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
						stepResults[currentID] = map[string]interface{}{ActivityErrorResultKey: true, "message": err.Error(), "branchId": firstCompleted.branchID}
						lastResult = stepResults[currentID]
						currentID = *step.OnFailureStepID
						continue
					}
					return nil, fmt.Errorf("parallel step branch %q failed: %w", firstCompleted.branchID, err)
				}
				branchResults[firstCompleted.branchID] = result
			}

			// Store aggregated results
			stepResults[currentID] = branchResults
			lastResult = branchResults

			if step.NextStepID != nil && *step.NextStepID != "" {
				currentID = *step.NextStepID
			} else {
				currentID = ""
			}

		default:
			currentID = ""
		}
	}

	return lastResult, nil
}

// executeBranchChain executes a chain of steps starting from branchStepID.
// Returns the final result of the branch execution.
func executeBranchChain(ctx workflow.Context, startStepID string, startStep StepDef, def WorkflowDef, input DynamicWorkflowInput, sharedStepResults map[string]interface{}, ao workflow.ActivityOptions) (interface{}, error) {
	logger := workflow.GetLogger(ctx)

	// Create branch-local step results (branches don't share intermediate results)
	branchStepResults := make(map[string]interface{})
	// Copy shared results (from before parallel step) for reference
	for k, v := range sharedStepResults {
		branchStepResults[k] = v
	}

	currentID := startStepID
	var lastBranchResult interface{}

	for currentID != "" {
		step, ok := def.Steps[currentID]
		if !ok {
			return nil, fmt.Errorf("step %q not found in branch", currentID)
		}
		logger.Info("executing branch step", "stepId", currentID, "type", step.Type)

		switch step.Type {
		case StepTypeActivity:
			resolvedInput, err := ResolveInput(step.Input, input.Input, branchStepResults)
			if err != nil {
				return nil, err
			}
			inputBytes := general.MustMarshalInput(resolvedInput)

			opts := ao
			if step.TimeoutSeconds != nil && *step.TimeoutSeconds > 0 {
				opts.StartToCloseTimeout = time.Duration(*step.TimeoutSeconds) * time.Second
			}
			if step.RetryPolicy != nil && step.RetryPolicy.MaximumAttempts > 0 {
				opts.RetryPolicy = &temporal.RetryPolicy{
					MaximumAttempts: int32(step.RetryPolicy.MaximumAttempts),
				}
				if step.RetryPolicy.BackoffCoefficient > 0 {
					opts.RetryPolicy.BackoffCoefficient = step.RetryPolicy.BackoffCoefficient
				}
				if step.RetryPolicy.InitialIntervalSeconds > 0 {
					opts.RetryPolicy.InitialInterval = time.Duration(step.RetryPolicy.InitialIntervalSeconds) * time.Second
				}
				if step.RetryPolicy.MaximumIntervalSeconds > 0 {
					opts.RetryPolicy.MaximumInterval = time.Duration(step.RetryPolicy.MaximumIntervalSeconds) * time.Second
				}
			}
			actCtx := workflow.WithActivityOptions(ctx, opts)

			var resultBytes []byte
			err = workflow.ExecuteActivity(actCtx, general.Dispatch, step.Name, inputBytes).Get(ctx, &resultBytes)
			if err != nil {
				if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
					branchStepResults[currentID] = map[string]interface{}{ActivityErrorResultKey: true, "message": err.Error()}
					lastBranchResult = branchStepResults[currentID]
					currentID = *step.OnFailureStepID
					continue
				}
				return nil, err
			}

			var result interface{}
			if len(resultBytes) > 0 {
				if err := json.Unmarshal(resultBytes, &result); err != nil {
					return nil, err
				}
			}
			branchStepResults[currentID] = result
			lastBranchResult = result

			if step.NextStepID != nil && *step.NextStepID != "" {
				currentID = *step.NextStepID
			} else {
				return result, nil
			}

		case StepTypeCondition:
			left, err := ResolveValueRef(step.Left, input.Input, branchStepResults)
			if err != nil {
				return nil, err
			}
			var right interface{}
			if step.Right != nil {
				right, err = ResolveValueRef(step.Right, input.Input, branchStepResults)
				if err != nil {
					return nil, err
				}
			}
			ok, err := EvaluateCondition(left, right, step.Operator)
			if err != nil {
				return nil, err
			}
			if ok {
				if step.ThenStepID != nil && *step.ThenStepID != "" {
					currentID = *step.ThenStepID
				} else {
					return true, nil
				}
			} else {
				if step.ElseStepID != nil && *step.ElseStepID != "" {
					currentID = *step.ElseStepID
				} else {
					return false, nil
				}
			}

		case StepTypeSignal:
			// Signal steps in parallel branches are not supported (would require complex coordination)
			return nil, fmt.Errorf("signal steps are not supported in parallel branches (non-deterministic)")

		default:
			return nil, fmt.Errorf("unsupported step type %q in parallel branch", step.Type)
		}
	}

	// Return last result if we exited the loop
	return lastBranchResult, nil
}
