import type { ValueRef } from "@/lib/workflow/types";

export function createLiteralValueRef(value: unknown, path?: string): ValueRef {
  return { type: "literal", value, ...(path ? { path } : {}) };
}

export function createInputValueRef(path?: string): ValueRef {
  return { type: "input", ...(path ? { path } : {}) };
}

export function createStepResultValueRef(stepId: string, path?: string): ValueRef {
  return { type: "stepResult", stepId, ...(path ? { path } : {}) };
}

export function isValueRef(obj: unknown): obj is ValueRef {
  if (typeof obj !== "object" || obj === null || !("type" in obj)) return false;
  const t = (obj as ValueRef).type;
  return t === "literal" || t === "input" || t === "stepResult";
}

export function isEmptyValueRef(v: ValueRef | null | undefined): boolean {
  if (!v) return true;
  if (v.type === "stepResult" && !v.stepId) return true;
  return false;
}
