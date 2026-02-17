/**
 * Validation for workflow definitions. Port of gosample/internal/workflows/general/validate.go.
 * Uses ACTIVITY_NAMES from activityRegistry for activity name checks.
 */

import { isActivityRegistered } from "@/lib/activityRegistry";
import type { StepDef, ValueRef, WorkflowDef } from "@/lib/workflow/types";
import {
  MaxSignalTimeoutSeconds,
  MinSignalTimeoutSeconds,
  StepTypeActivity,
  StepTypeCondition,
  StepTypeSignal,
  StepTypeParallel,
  JoinAll,
  JoinAny,
  ValidJoinStrategies,
  SUPPORTED_DEFINITION_VERSIONS,
  VALID_CONDITION_OPERATORS,
  ValueRefLiteral,
  ValueRefInput,
  ValueRefStepResult,
} from "@/lib/workflow/types";

export interface ValidateOptions {
  /** If true, do not fail when some steps are unreachable (e.g. disconnected nodes). Use for export/copy. */
  allowUnreachable?: boolean;
}

export function validate(def: WorkflowDef | null, options?: ValidateOptions): string | null {
  if (def == null) return "workflow definition is nil";
  const steps = def.steps ?? {};
  const stepIds = Object.keys(steps);
  const allowUnreachable = options?.allowUnreachable === true;

  if (stepIds.length === 0) {
    if (def.startStepId != null && def.startStepId !== "")
      return `startStepId "${def.startStepId}" references non-existent step`;
    return null;
  }

  if (def.startStepId == null || def.startStepId === "")
    return "startStepId is required when there are steps";
  if (!(def.startStepId in steps))
    return `startStepId "${def.startStepId}" is not a key in steps`;

  if (def.version == null || def.version === "")
    return "definition version is required";
  if (!SUPPORTED_DEFINITION_VERSIONS[def.version])
    return `unsupported definition version "${def.version}"`;

  const referenced: Record<string, boolean> = { [def.startStepId]: true };
  for (const id of stepIds) {
    const err = validateStep(id, steps[id], steps, referenced);
    if (err) return err;
  }

  if (!allowUnreachable) {
    for (const id of stepIds) {
      if (!referenced[id])
        return `unreachable step "${id}" (not referenced from start or any step)`;
    }
  }

  const cycleErr = checkCycles(steps, def.startStepId, {});
  if (cycleErr) return cycleErr;
  return null;
}

function validateStep(
  id: string,
  step: StepDef,
  steps: Record<string, StepDef>,
  referenced: Record<string, boolean>
): string | null {
  switch (step.type) {
    case StepTypeActivity: {
      if (!step.name || step.name === "")
        return `step "${id}": activity step must have non-empty name`;
      if (!isActivityRegistered(step.name))
        return `step "${id}": unknown activity name "${step.name}"`;
      if (step.nextStepId != null && step.nextStepId !== "") {
        referenced[step.nextStepId] = true;
        if (!(step.nextStepId in steps))
          return `step "${id}": nextStepId "${step.nextStepId}" is not a key in steps`;
      }
      if (step.onFailureStepId != null && step.onFailureStepId !== "") {
        referenced[step.onFailureStepId] = true;
        if (!(step.onFailureStepId in steps))
          return `step "${id}": onFailureStepId "${step.onFailureStepId}" is not a key in steps`;
      }
      break;
    }
    case StepTypeSignal: {
      if (!step.signalName || step.signalName === "")
        return `step "${id}": signal step must have non-empty signalName`;
      if (
        step.signalTimeoutSeconds == null ||
        step.signalTimeoutSeconds < MinSignalTimeoutSeconds ||
        step.signalTimeoutSeconds > MaxSignalTimeoutSeconds
      )
        return `step "${id}": signalTimeoutSeconds must be between ${MinSignalTimeoutSeconds} and ${MaxSignalTimeoutSeconds}`;
      if (step.nextStepId == null || step.nextStepId === "")
        return `step "${id}": signal step must have nextStepId`;
      if (step.timeoutStepId == null || step.timeoutStepId === "")
        return `step "${id}": signal step must have timeoutStepId`;
      referenced[step.nextStepId] = true;
      if (!(step.nextStepId in steps))
        return `step "${id}": nextStepId "${step.nextStepId}" is not a key in steps`;
      referenced[step.timeoutStepId] = true;
      if (!(step.timeoutStepId in steps))
        return `step "${id}": timeoutStepId "${step.timeoutStepId}" is not a key in steps`;
      break;
    }
    case StepTypeCondition: {
      if (step.left == null)
        return `step "${id}": condition step must have left operand`;
      if (!step.operator || step.operator === "")
        return `step "${id}": condition step must have operator`;
      if (!VALID_CONDITION_OPERATORS[step.operator])
        return `step "${id}": invalid operator "${step.operator}"`;
      if (step.operator !== "exists" && step.operator !== "isEmpty") {
        if (step.right == null)
          return `step "${id}": condition with operator "${step.operator}" requires right operand`;
      }
      if (step.thenStepId != null && step.thenStepId !== "") {
        referenced[step.thenStepId] = true;
        if (!(step.thenStepId in steps))
          return `step "${id}": thenStepId "${step.thenStepId}" is not a key in steps`;
      }
      if (step.elseStepId != null && step.elseStepId !== "") {
        referenced[step.elseStepId] = true;
        if (!(step.elseStepId in steps))
          return `step "${id}": elseStepId "${step.elseStepId}" is not a key in steps`;
      }
      const leftErr = validateValueRef(step.left, steps, id, "left");
      if (leftErr) return leftErr;
      if (step.right != null) {
        const rightErr = validateValueRef(step.right, steps, id, "right");
        if (rightErr) return rightErr;
      }
      break;
    }
    case StepTypeParallel: {
      if (!step.branchStepIds || step.branchStepIds.length === 0)
        return `step "${id}": parallel step must have at least one branchStepId`;
      if (!step.join || step.join === "")
        return `step "${id}": parallel step must have join strategy (all or any)`;
      if (!ValidJoinStrategies[step.join])
        return `step "${id}": invalid join strategy "${step.join}" (must be all or any)`;
      // Validate each branch step exists and is not a parallel step (no nested parallel)
      for (const branchID of step.branchStepIds) {
        const branchStep = steps[branchID];
        if (!branchStep)
          return `step "${id}": branchStepId "${branchID}" is not a key in steps`;
        if (branchStep.type === StepTypeParallel)
          return `step "${id}": nested parallel steps are not supported (branchStepId "${branchID}")`;
        referenced[branchID] = true;
      }
      if (step.nextStepId != null && step.nextStepId !== "") {
        referenced[step.nextStepId] = true;
        if (!(step.nextStepId in steps))
          return `step "${id}": nextStepId "${step.nextStepId}" is not a key in steps`;
      }
      if (step.onFailureStepId != null && step.onFailureStepId !== "") {
        referenced[step.onFailureStepId] = true;
        if (!(step.onFailureStepId in steps))
          return `step "${id}": onFailureStepId "${step.onFailureStepId}" is not a key in steps`;
      }
      break;
    }
    default:
      return `step "${id}": invalid type "${step.type}" (must be activity, condition, signal, or parallel)`;
  }
  return null;
}

function validateValueRef(
  v: ValueRef | null | undefined,
  steps: Record<string, StepDef>,
  stepId: string,
  field: string
): string | null {
  if (v == null) return null;
  switch (v.type) {
    case ValueRefLiteral:
      break;
    case ValueRefInput:
      break;
    case ValueRefStepResult:
      if (!v.stepId || v.stepId === "")
        return `step "${stepId}": ${field} stepResult must have stepId`;
      if (!(v.stepId in steps))
        return `step "${stepId}": ${field} stepResult stepId "${v.stepId}" is not a key in steps`;
      break;
    default:
      return `step "${stepId}": ${field} has invalid value ref type "${v.type}"`;
  }
  return null;
}

function checkCycles(
  steps: Record<string, StepDef>,
  startId: string,
  path: Record<string, boolean>
): string | null {
  if (path[startId])
    return `cycle detected: step "${startId}" is reachable again`;
  const nextPath = { ...path, [startId]: true };
  const step = steps[startId];
  if (!step) return null;

  const nextIds: string[] = [];
  switch (step.type) {
    case StepTypeActivity:
      if (step.nextStepId != null && step.nextStepId !== "")
        nextIds.push(step.nextStepId);
      if (step.onFailureStepId != null && step.onFailureStepId !== "")
        nextIds.push(step.onFailureStepId);
      break;
    case StepTypeCondition:
      if (step.thenStepId != null && step.thenStepId !== "")
        nextIds.push(step.thenStepId);
      if (step.elseStepId != null && step.elseStepId !== "")
        nextIds.push(step.elseStepId);
      break;
    case StepTypeSignal:
      if (step.nextStepId != null && step.nextStepId !== "")
        nextIds.push(step.nextStepId);
      if (step.timeoutStepId != null && step.timeoutStepId !== "")
        nextIds.push(step.timeoutStepId);
      break;
    case StepTypeParallel:
      // For parallel steps, check cycles in each branch, then continue with nextStepId/onFailureStepId
      if (step.branchStepIds) {
        for (const branchID of step.branchStepIds) {
          const err = checkCycles(steps, branchID, nextPath);
          if (err) return err;
        }
      }
      if (step.nextStepId != null && step.nextStepId !== "")
        nextIds.push(step.nextStepId);
      if (step.onFailureStepId != null && step.onFailureStepId !== "")
        nextIds.push(step.onFailureStepId);
      break;
  }
  for (const nid of nextIds) {
    const err = checkCycles(steps, nid, nextPath);
    if (err) return err;
  }
  return null;
}
