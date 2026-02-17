# Dynamic workflow definitions

## Basic Examples

- **example_activity_inputs.json** – Each activity has its own `input`; inputs are not shared. Step A: workflow input only. Step B: workflow input + step A's **output**. Step C: literals + step B's **output** (path). Illustrates that only each step's resolved payload is sent to that activity.
- **example_validate_process.json** – Validate then condition; process or log error (no signal).
- **single_activity.json** – Single activity, no condition.
- **linear_chain.json** – Two activities in sequence.
- **condition_only_then.json** – Condition with only then branch.

## Signal Examples

- **email_with_signal.json** – Activity (SendEmail) → signal wait (`email_outcome`, 60s timeout) → handleOutcome or handleTimeout.
- **signal_timeout_then_condition.json** – Signal step; both next and timeout go to same step, then condition on `_timeout` to branch.
- **signal_minimal.json** – Workflow starts with a signal step (wait for `ping`, 120s timeout).

## Parallel Step Examples

- **parallel_all_join.json** – Parallel execution with "all" join strategy. Fetches user, product, and order data concurrently, then aggregates results. Demonstrates waiting for all branches to complete.
- **parallel_any_join.json** – Parallel execution with "any" join strategy. Tries multiple data sources concurrently and proceeds with the first one that completes. Useful for redundancy/failover scenarios.
- **parallel_with_conditions.json** – Parallel branches containing condition steps. Each branch performs a different validation check (user status, product existence, inventory) concurrently.
- **parallel_with_error_handling.json** – Parallel step with error handling. Demonstrates `onFailureStepId` for parallel steps and retry policies on individual branch activities.
- **parallel_complex_workflow.json** – Complex workflow combining parallel execution with conditions, error handling, and result verification. Processes payment, updates inventory, and sends notification in parallel.
- **parallel_any_first_success.json** – "Any" join strategy example: tries cache first (fast) or database fetch (slower), proceeds with whichever completes first.

## Parallel Step Notes

- **Join strategies**: `"all"` waits for all branches to complete; `"any"` proceeds when the first branch completes.
- **Branch results**: Results are stored in a map keyed by branch step ID: `stepResults[parallelStepId][branchStepId]`.
- **Error handling**: Use `onFailureStepId` on the parallel step to handle failures. Individual branches can have their own `onFailureStepId` as well.
- **Nested parallel**: Not supported (prevents complexity and determinism issues).
- **Signal steps**: Not allowed in parallel branches (non-deterministic).

To signal a running workflow from a client: `client.SignalWorkflow(ctx, workflowID, runID, signalName, payload)`. Use the workflow ID from the start response; runID can be empty to target the current run.
