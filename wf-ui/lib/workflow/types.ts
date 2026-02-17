/**
 * Workflow types mirroring gosample/internal/workflows/general/workflow_def.go
 * Used for JSON export and validation.
 */

export interface WorkflowDef {
  version: string;
  startStepId?: string | null;
  steps: Record<string, StepDef>;
}

export interface StepDef {
  type: string;
  // Activity
  name?: string;
  input?: unknown;
  nextStepId?: string | null;
  onFailureStepId?: string | null;
  timeoutSeconds?: number | null;
  retryPolicy?: RetryPolicy | null;
  // Condition
  left?: ValueRef | null;
  operator?: string;
  right?: ValueRef | null;
  thenStepId?: string | null;
  elseStepId?: string | null;
  // Signal
  signalName?: string;
  signalTimeoutSeconds?: number;
  timeoutStepId?: string | null;
  // Parallel
  branchStepIds?: string[];
  join?: string; // "all" or "any"
}

export interface RetryPolicy {
  maximumAttempts?: number;
  backoffCoefficient?: number;
  initialIntervalSeconds?: number;
  maximumIntervalSeconds?: number;
}

export interface ValueRef {
  type: "literal" | "input" | "stepResult";
  value?: unknown;
  path?: string;
  stepId?: string;
}

export const StepTypeActivity = "activity";
export const StepTypeCondition = "condition";
export const StepTypeSignal = "signal";
export const StepTypeParallel = "parallel";

export const JoinAll = "all";
export const JoinAny = "any";

export const ValidJoinStrategies: Record<string, boolean> = {
  [JoinAll]: true,
  [JoinAny]: true,
};

export const MinSignalTimeoutSeconds = 1;
export const MaxSignalTimeoutSeconds = 31536000; // 1 year

export const ValueRefLiteral = "literal";
export const ValueRefInput = "input";
export const ValueRefStepResult = "stepResult";

export const SUPPORTED_DEFINITION_VERSIONS: Record<string, boolean> = { "1.0": true };

export const CONDITION_OPERATORS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
  "exists",
  "isEmpty",
  "contains",
] as const;

export const VALID_CONDITION_OPERATORS: Record<string, boolean> = {
  eq: true,
  ne: true,
  gt: true,
  gte: true,
  lt: true,
  lte: true,
  in: true,
  notIn: true,
  exists: true,
  isEmpty: true,
  contains: true,
};

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];
