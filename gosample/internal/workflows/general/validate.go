package general

import (
	"errors"
	"fmt"

	generalactivities "gosample/internal/activities/general"
)

// Validate checks the workflow definition: step refs, types, activity names, version, and no cycles.
func Validate(def *WorkflowDef) error {
	if def == nil {
		return errors.New("workflow definition is nil")
	}
	if len(def.Steps) == 0 {
		if def.StartStepID != nil && *def.StartStepID != "" {
			return fmt.Errorf("startStepId %q references non-existent step", *def.StartStepID)
		}
		return nil
	}

	// startStepId is required when there is at least one step (deterministic start, no map iteration)
	if def.StartStepID == nil || *def.StartStepID == "" {
		return errors.New("startStepId is required when there are steps")
	}
	if _, ok := def.Steps[*def.StartStepID]; !ok {
		return fmt.Errorf("startStepId %q is not a key in steps", *def.StartStepID)
	}

	// Version must be supported
	if def.Version == "" {
		return errors.New("definition version is required")
	}
	if !SupportedDefinitionVersions[def.Version] {
		return fmt.Errorf("unsupported definition version %q", def.Version)
	}

	// Validate each step and collect step IDs referenced by next/then/else/onFailure/timeout
	referenced := make(map[string]bool)
	referenced[*def.StartStepID] = true
	for id, step := range def.Steps {
		if err := validateStep(id, &step, def.Steps, referenced); err != nil {
			return err
		}
	}

	// Unreachable steps: every step must be start or referenced
	for id := range def.Steps {
		if !referenced[id] {
			return fmt.Errorf("unreachable step %q (not referenced from start or any step)", id)
		}
	}

	// Cycle check from definition start (resume start is validated in workflow when building input)
	if err := checkCycles(def.Steps, *def.StartStepID, nil); err != nil {
		return err
	}
	return nil
}

// CheckCycles verifies there are no cycles from startID. Call from workflow after resolving start (including resume).
func CheckCycles(steps map[string]StepDef, startID string) error {
	return checkCycles(steps, startID, nil)
}

func validateStep(id string, step *StepDef, steps map[string]StepDef, referenced map[string]bool) error {
	switch step.Type {
	case StepTypeActivity:
		if step.Name == "" {
			return fmt.Errorf("step %q: activity step must have non-empty name", id)
		}
		if !generalactivities.IsActivityRegistered(step.Name) {
			return fmt.Errorf("step %q: unknown activity name %q", id, step.Name)
		}
		if step.NextStepID != nil && *step.NextStepID != "" {
			referenced[*step.NextStepID] = true
			if _, ok := steps[*step.NextStepID]; !ok {
				return fmt.Errorf("step %q: nextStepId %q is not a key in steps", id, *step.NextStepID)
			}
		}
		if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
			referenced[*step.OnFailureStepID] = true
			if _, ok := steps[*step.OnFailureStepID]; !ok {
				return fmt.Errorf("step %q: onFailureStepId %q is not a key in steps", id, *step.OnFailureStepID)
			}
		}
	case StepTypeSignal:
		if step.SignalName == "" {
			return fmt.Errorf("step %q: signal step must have non-empty signalName", id)
		}
		if step.SignalTimeoutSeconds < MinSignalTimeoutSeconds || step.SignalTimeoutSeconds > MaxSignalTimeoutSeconds {
			return fmt.Errorf("step %q: signalTimeoutSeconds must be between %d and %d", id, MinSignalTimeoutSeconds, MaxSignalTimeoutSeconds)
		}
		if step.NextStepID == nil || *step.NextStepID == "" {
			return fmt.Errorf("step %q: signal step must have nextStepId", id)
		}
		if step.TimeoutStepID == nil || *step.TimeoutStepID == "" {
			return fmt.Errorf("step %q: signal step must have timeoutStepId", id)
		}
		referenced[*step.NextStepID] = true
		if _, ok := steps[*step.NextStepID]; !ok {
			return fmt.Errorf("step %q: nextStepId %q is not a key in steps", id, *step.NextStepID)
		}
		referenced[*step.TimeoutStepID] = true
		if _, ok := steps[*step.TimeoutStepID]; !ok {
			return fmt.Errorf("step %q: timeoutStepId %q is not a key in steps", id, *step.TimeoutStepID)
		}
	case StepTypeCondition:
		if step.Left == nil {
			return fmt.Errorf("step %q: condition step must have left operand", id)
		}
		if step.Operator == "" {
			return fmt.Errorf("step %q: condition step must have operator", id)
		}
		if !ValidConditionOperators[step.Operator] {
			return fmt.Errorf("step %q: invalid operator %q", id, step.Operator)
		}
		if step.Operator != OpExists && step.Operator != OpIsEmpty && step.Right == nil {
			return fmt.Errorf("step %q: condition with operator %q requires right operand", id, step.Operator)
		}
		if step.ThenStepID != nil && *step.ThenStepID != "" {
			referenced[*step.ThenStepID] = true
			if _, ok := steps[*step.ThenStepID]; !ok {
				return fmt.Errorf("step %q: thenStepId %q is not a key in steps", id, *step.ThenStepID)
			}
		}
		if step.ElseStepID != nil && *step.ElseStepID != "" {
			referenced[*step.ElseStepID] = true
			if _, ok := steps[*step.ElseStepID]; !ok {
				return fmt.Errorf("step %q: elseStepId %q is not a key in steps", id, *step.ElseStepID)
			}
		}
		if err := validateValueRef(step.Left, steps, id, "left"); err != nil {
			return err
		}
		if step.Right != nil {
			if err := validateValueRef(step.Right, steps, id, "right"); err != nil {
				return err
			}
		}
	case StepTypeParallel:
		if len(step.BranchStepIDs) == 0 {
			return fmt.Errorf("step %q: parallel step must have at least one branchStepId", id)
		}
		if step.Join == "" {
			return fmt.Errorf("step %q: parallel step must have join strategy (all or any)", id)
		}
		if !ValidJoinStrategies[step.Join] {
			return fmt.Errorf("step %q: invalid join strategy %q (must be all or any)", id, step.Join)
		}
		// Validate each branch step exists and is not a parallel step (no nested parallel)
		for _, branchID := range step.BranchStepIDs {
			branchStep, ok := steps[branchID]
			if !ok {
				return fmt.Errorf("step %q: branchStepId %q is not a key in steps", id, branchID)
			}
			if branchStep.Type == StepTypeParallel {
				return fmt.Errorf("step %q: nested parallel steps are not supported (branchStepId %q)", id, branchID)
			}
			referenced[branchID] = true
		}
		if step.NextStepID != nil && *step.NextStepID != "" {
			referenced[*step.NextStepID] = true
			if _, ok := steps[*step.NextStepID]; !ok {
				return fmt.Errorf("step %q: nextStepId %q is not a key in steps", id, *step.NextStepID)
			}
		}
		if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
			referenced[*step.OnFailureStepID] = true
			if _, ok := steps[*step.OnFailureStepID]; !ok {
				return fmt.Errorf("step %q: onFailureStepId %q is not a key in steps", id, *step.OnFailureStepID)
			}
		}
	default:
		return fmt.Errorf("step %q: invalid type %q (must be activity, condition, signal, or parallel)", id, step.Type)
	}
	return nil
}

func validateValueRef(v *ValueRef, steps map[string]StepDef, stepID, field string) error {
	if v == nil {
		return nil
	}
	switch v.Type {
	case ValueRefLiteral:
		// value can be anything
	case ValueRefInput:
		// path optional
	case ValueRefStepResult:
		if v.StepID == "" {
			return fmt.Errorf("step %q: %s stepResult must have stepId", stepID, field)
		}
		if _, ok := steps[v.StepID]; !ok {
			return fmt.Errorf("step %q: %s stepResult stepId %q is not a key in steps", stepID, field, v.StepID)
		}
	default:
		return fmt.Errorf("step %q: %s has invalid value ref type %q", stepID, field, v.Type)
	}
	return nil
}

// checkCycles does a DFS from start and returns an error if a cycle is found.
func checkCycles(steps map[string]StepDef, startID string, path map[string]bool) error {
	if path == nil {
		path = make(map[string]bool)
	}
	if path[startID] {
		return fmt.Errorf("cycle detected: step %q is reachable again", startID)
	}
	path[startID] = true
	defer func() { path[startID] = false }()

	step, ok := steps[startID]
	if !ok {
		return nil
	}

	var nextIDs []string
	switch step.Type {
	case StepTypeActivity:
		if step.NextStepID != nil && *step.NextStepID != "" {
			nextIDs = append(nextIDs, *step.NextStepID)
		}
		if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
			nextIDs = append(nextIDs, *step.OnFailureStepID)
		}
	case StepTypeCondition:
		if step.ThenStepID != nil && *step.ThenStepID != "" {
			nextIDs = append(nextIDs, *step.ThenStepID)
		}
		if step.ElseStepID != nil && *step.ElseStepID != "" {
			nextIDs = append(nextIDs, *step.ElseStepID)
		}
	case StepTypeSignal:
		if step.NextStepID != nil && *step.NextStepID != "" {
			nextIDs = append(nextIDs, *step.NextStepID)
		}
		if step.TimeoutStepID != nil && *step.TimeoutStepID != "" {
			nextIDs = append(nextIDs, *step.TimeoutStepID)
		}
	case StepTypeParallel:
		// For parallel steps, check cycles in each branch, then continue with nextStepId/onFailureStepId
		for _, branchID := range step.BranchStepIDs {
			if err := checkCycles(steps, branchID, path); err != nil {
				return err
			}
		}
		if step.NextStepID != nil && *step.NextStepID != "" {
			nextIDs = append(nextIDs, *step.NextStepID)
		}
		if step.OnFailureStepID != nil && *step.OnFailureStepID != "" {
			nextIDs = append(nextIDs, *step.OnFailureStepID)
		}
	}

	for _, nid := range nextIDs {
		if err := checkCycles(steps, nid, path); err != nil {
			return err
		}
	}
	return nil
}
