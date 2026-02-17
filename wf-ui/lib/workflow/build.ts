/**
 * Build WorkflowDef (gosample JSON shape) from React Flow nodes and edges.
 * Node id = stepId; node data holds step definition; edges can override next/then/else/timeout/onFailure.
 */

import type { StepDef, WorkflowDef } from "@/lib/workflow/types";
import type { StepNodeData } from "@/types/editor";
import type { Edge, Node } from "@xyflow/react";

const STEP_TYPES = ["activity", "condition", "signal", "parallel"] as const;

function isStepNodeData(d: unknown): d is StepNodeData {
  return (
    typeof d === "object" &&
    d !== null &&
    "stepType" in d &&
    STEP_TYPES.includes((d as StepNodeData).stepType as (typeof STEP_TYPES)[number])
  );
}

/**
 * Infer start step: the step that has no incoming edges from other steps.
 * If multiple candidates, pick the one with smallest id (deterministic).
 * If none (all have incoming), pick first by id (single node or cycle case).
 */
function inferStartStepId(
  stepIds: string[],
  edges: { source: string; target: string }[]
): string {
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (stepIds.includes(e.target)) hasIncoming.add(e.target);
  }
  const candidates = stepIds.filter((id) => !hasIncoming.has(id));
  if (candidates.length >= 1) {
    candidates.sort();
    return candidates[0];
  }
  stepIds.sort();
  return stepIds[0];
}

/**
 * Optionally override step's nextStepId/thenStepId/elseStepId/timeoutStepId/onFailureStepId
 * from edge targets (edge label → field). Node data remains source for other fields.
 * For parallel steps, also collect branchStepIds from branch edges.
 */
function applyEdgesToStep(
  stepId: string,
  step: StepDef,
  edges: { source: string; target: string; sourceHandle?: string; data?: { label?: string } }[]
): StepDef {
  const outEdges = edges.filter((e) => e.source === stepId);
  const out: StepDef = { ...step };
  
  if (step.type === "parallel") {
    // For parallel steps, collect branch edges
    const branchEdges = outEdges.filter(
      (e) => e.sourceHandle?.startsWith("branch-") || e.data?.label === "branch"
    );
    if (branchEdges.length > 0) {
      out.branchStepIds = branchEdges.map((e) => e.target).sort();
    }
  }
  
  for (const e of outEdges) {
    const label = (e.data?.label ?? "next") as string;
    const handle = e.sourceHandle ?? "";
    const target = e.target;
    
    // Skip branch edges for parallel steps (already handled above)
    if (step.type === "parallel" && (handle.startsWith("branch-") || label === "branch")) {
      continue;
    }
    
    if (label === "next" || handle === "next") out.nextStepId = target;
    else if (label === "then" || handle === "then") out.thenStepId = target;
    else if (label === "else" || handle === "else") out.elseStepId = target;
    else if (label === "timeout" || handle === "timeout") out.timeoutStepId = target;
    else if (label === "onFailure" || handle === "onFailure") out.onFailureStepId = target;
  }
  return out;
}

function nodeDataToStepDef(nodeId: string, data: StepNodeData): StepDef | null {
  if (data.stepType === "activity") {
    return {
      type: "activity",
      name: data.name ?? "",
      input: data.input,
      nextStepId: data.nextStepId ?? undefined,
      onFailureStepId: data.onFailureStepId ?? undefined,
      timeoutSeconds: data.timeoutSeconds ?? undefined,
      retryPolicy: data.retryPolicy ?? undefined,
    };
  }
  if (data.stepType === "condition") {
    return {
      type: "condition",
      left: data.left ?? undefined,
      operator: data.operator ?? "eq",
      right: data.right ?? undefined,
      thenStepId: data.thenStepId ?? undefined,
      elseStepId: data.elseStepId ?? undefined,
    };
  }
  if (data.stepType === "signal") {
    return {
      type: "signal",
      signalName: data.signalName ?? "",
      signalTimeoutSeconds: data.signalTimeoutSeconds ?? 60,
      nextStepId: data.nextStepId ?? undefined,
      timeoutStepId: data.timeoutStepId ?? undefined,
    };
  }
  if (data.stepType === "parallel") {
    return {
      type: "parallel",
      branchStepIds: data.branchStepIds ?? [],
      join: data.join ?? "all",
      nextStepId: data.nextStepId ?? undefined,
      onFailureStepId: data.onFailureStepId ?? undefined,
    };
  }
  return null;
}

/**
 * Detect parallel patterns: when multiple edges from the same node use the same handle (like "next"),
 * create a parallel step that wraps those branches.
 */
function detectAndCreateParallelSteps(
  nodes: Node[],
  edges: Edge[],
  steps: Record<string, StepDef>
): { steps: Record<string, StepDef>; edges: Edge[] } {
  const stepNodes = nodes.filter(
    (n): n is Node<StepNodeData> => isStepNodeData(n.data)
  );
  const stepIds = new Set(stepNodes.map((n) => n.id));
  
  // Group edges by source and handle
  const edgesBySource = new Map<string, Map<string, Edge[]>>();
  for (const edge of edges) {
    if (!stepIds.has(edge.source) || !stepIds.has(edge.target)) continue;
    const handle = (edge.sourceHandle ?? "next") as string;
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, new Map());
    }
    const handleMap = edgesBySource.get(edge.source)!;
    if (!handleMap.has(handle)) {
      handleMap.set(handle, []);
    }
    handleMap.get(handle)!.push(edge);
  }

  const newSteps = { ...steps };
  const newEdges: Edge[] = [];
  const parallelStepMap = new Map<string, string>(); // sourceId -> parallelStepId

  // First, check if there are existing parallel nodes and use their branchStepIds
  const existingParallelNodes = stepNodes.filter(
    (n) => (n.data as StepNodeData).stepType === "parallel"
  );
  for (const parallelNode of existingParallelNodes) {
    const parallelData = parallelNode.data as ParallelNodeData;
    if (parallelData.branchStepIds && parallelData.branchStepIds.length > 0) {
      // Parallel node already exists with branches - use it as-is
      const parallelStep = newSteps[parallelNode.id];
      if (parallelStep && parallelStep.type === "parallel") {
        // Already processed, skip
        continue;
      }
    }
  }

  // Check each source node for parallel patterns
  for (const [sourceId, handleMap] of edgesBySource.entries()) {
    // Only check "next" handle for parallel detection (other handles like "then"/"else" are for conditions)
    const nextEdges = handleMap.get("next") ?? [];
    const sourceStep = newSteps[sourceId];
    
    // Skip if source is already a parallel step or doesn't exist
    if (!sourceStep || sourceStep.type === "parallel") continue;
    
    if (nextEdges.length > 1) {
      // Multiple "next" edges detected - check if there's already a parallel step node
      // Look for existing parallel step that connects from this source
      let existingParallelId: string | undefined;
      for (const [stepId, step] of Object.entries(newSteps)) {
        if (step.type === "parallel" && step.branchStepIds) {
          const branchIds = new Set(step.branchStepIds);
          const nextTargets = new Set(nextEdges.map((e) => e.target));
          // Check if this parallel step matches our branches
          if (
            branchIds.size === nextTargets.size &&
            [...branchIds].every((id) => nextTargets.has(id))
          ) {
            // Check if source step points to this parallel step
            if (sourceStep.nextStepId === stepId) {
              existingParallelId = stepId;
              break;
            }
          }
        }
      }
      
      if (existingParallelId) {
        // Use existing parallel step
        parallelStepMap.set(sourceId, existingParallelId);
      } else {
        // Create new parallel step
        const branchStepIds = nextEdges.map((e) => e.target).sort(); // Sort for determinism
        const parallelStepId = `parallel_${sourceId}`;
        
        // Create parallel step
        newSteps[parallelStepId] = {
          type: "parallel",
          branchStepIds,
          join: "all", // Default to "all", can be configured later
        };

        // Update source step to point to parallel step instead
        sourceStep.nextStepId = parallelStepId;
        parallelStepMap.set(sourceId, parallelStepId);
      }
    }
  }

  // Rebuild edges: keep non-"next" edges, replace multiple "next" edges with parallel step connection
  for (const edge of edges) {
    if (!stepIds.has(edge.source) || !stepIds.has(edge.target)) {
      newEdges.push(edge);
      continue;
    }

    const handle = (edge.sourceHandle ?? "next") as string;
    const nextEdges = edgesBySource.get(edge.source)?.get("next") ?? [];
    const hasParallel = parallelStepMap.has(edge.source);
    
    if (handle === "next" && nextEdges.length > 1 && hasParallel) {
      // This is part of a parallel pattern - skip individual edges, parallel step handles it via branchStepIds
      continue;
    }
    
    // Keep other edges (then/else/timeout/onFailure) and single "next" edges
    newEdges.push(edge);
  }

  // Add edge from source to parallel step if parallel was created
  for (const [sourceId, parallelStepId] of parallelStepMap.entries()) {
    newEdges.push({
      id: `e-${sourceId}-next-${parallelStepId}`,
      source: sourceId,
      target: parallelStepId,
      sourceHandle: "next",
      data: { label: "next" },
    } as Edge);
  }

  return { steps: newSteps, edges: newEdges };
}

/**
 * Build workflow JSON from flow state. Only nodes with step data (activity/condition/signal) are included.
 * Start step is inferred as the step with no incoming edges (or first by id if multiple/none).
 * Automatically detects parallel patterns: when multiple edges from the same node use "next" handle.
 */
export function buildWorkflowFromFlow(
  nodes: Node[],
  edges: Edge[]
): WorkflowDef {
  const stepNodes = nodes.filter(
    (n): n is Node<StepNodeData> => isStepNodeData(n.data)
  );
  const stepIds = stepNodes.map((n) => n.id);
  const steps: Record<string, StepDef> = {};

  for (const node of stepNodes) {
    const data = node.data as StepNodeData;
    const step = nodeDataToStepDef(node.id, data);
    if (!step) continue;
    steps[node.id] = step;
  }

  const edgeList = edges.map((e) => ({
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    data: e.data as { label?: string } | undefined,
  }));

  // Apply edges to steps first
  for (const id of Object.keys(steps)) {
    steps[id] = applyEdgesToStep(id, steps[id], edgeList);
  }

  // Detect parallel patterns and create parallel steps
  const { steps: stepsWithParallel, edges: processedEdges } = detectAndCreateParallelSteps(
    nodes,
    edges,
    steps
  );

  // Apply edges again after parallel step creation
  const finalEdgeList = processedEdges.map((e) => ({
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    data: e.data as { label?: string } | undefined,
  }));

  for (const id of Object.keys(stepsWithParallel)) {
    stepsWithParallel[id] = applyEdgesToStep(id, stepsWithParallel[id], finalEdgeList);
  }

  const allStepIds = Object.keys(stepsWithParallel);
  if (allStepIds.length === 0) {
    return { version: "1.0", steps: {} };
  }

  const startStepId = inferStartStepId(allStepIds, finalEdgeList);
  return {
    version: "1.0",
    startStepId,
    steps: stepsWithParallel,
  };
}

/**
 * Serialize to JSON string matching gosample format (omit empty optional fields where appropriate).
 */
export function workflowToJson(def: WorkflowDef): string {
  const out: WorkflowDef = {
    version: def.version,
    steps: def.steps,
  };
  if (Object.keys(def.steps).length > 0 && def.startStepId != null) {
    out.startStepId = def.startStepId;
  }
  return JSON.stringify(out);
}
