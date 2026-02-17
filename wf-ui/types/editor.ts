import type { ValueRef } from "@/lib/workflow/types";

/**
 * Editor-specific types: React Flow node data and edge labels.
 */

export type StepType = "activity" | "condition" | "signal" | "parallel";

export type EdgeLabel = "next" | "then" | "else" | "timeout" | "onFailure";

/** Compatible with React Flow's Record<string, unknown> for node data */
export interface BaseNodeData {
  stepId: string;
  stepType: StepType;
  [key: string]: unknown;
}

export interface ActivityNodeData extends BaseNodeData {
  stepType: "activity";
  name: string;
  input?: unknown;
  nextStepId?: string | null;
  onFailureStepId?: string | null;
  timeoutSeconds?: number | null;
  retryPolicy?: {
    maximumAttempts?: number;
    backoffCoefficient?: number;
    initialIntervalSeconds?: number;
    maximumIntervalSeconds?: number;
  } | null;
}

export interface ConditionNodeData extends BaseNodeData {
  stepType: "condition";
  left?: ValueRef | null;
  operator: string;
  right?: ValueRef | null;
  thenStepId?: string | null;
  elseStepId?: string | null;
}

export interface SignalNodeData extends BaseNodeData {
  stepType: "signal";
  signalName: string;
  signalTimeoutSeconds: number;
  nextStepId?: string | null;
  timeoutStepId?: string | null;
}

export interface ParallelNodeData extends BaseNodeData {
  stepType: "parallel";
  branchStepIds: string[];
  join: "all" | "any";
  nextStepId?: string | null;
  onFailureStepId?: string | null;
}

export type StepNodeData = ActivityNodeData | ConditionNodeData | SignalNodeData | ParallelNodeData;

export interface WorkflowEdgeData {
  label?: EdgeLabel;
}
