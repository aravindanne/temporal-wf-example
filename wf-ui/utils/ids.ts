let stepCounter = 0;

export function generateStepId(prefix: string = "step"): string {
  stepCounter += 1;
  return `${prefix}_${stepCounter}`;
}

export function resetStepIdCounter(): void {
  stepCounter = 0;
}

/**
 * When loading a workflow, set counter above max numeric suffix so new steps don't collide.
 */
export function setStepIdCounterMin(min: number): void {
  if (stepCounter < min) stepCounter = min;
}
