/**
 * Import/export format: workflow JSON plus optional UI metadata so re-import restores the diagram.
 * - Plain workflow: { version, startStepId?, steps } (gosample shape)
 * - With UI: { workflow: WorkflowDef, ui: { nodes, edges } }
 */

import type { WorkflowDef, StepDef } from "@/lib/workflow/types";
import type { StepNodeData } from "@/types/editor";
import type { Edge, Node } from "@xyflow/react";

export interface WorkflowExportFormat {
  workflow: WorkflowDef;
  ui?: {
    nodes: SerializedNode[];
    edges: SerializedEdge[];
  };
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface SerializedEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  data?: { label?: string } | null;
}

/** Root has "workflow" key => full format; else assume plain WorkflowDef */
export function parseImportJson(json: string): WorkflowExportFormat | { workflow: WorkflowDef; ui?: undefined } {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (raw != null && typeof raw === "object" && "workflow" in raw && raw.workflow != null) {
    return raw as WorkflowExportFormat;
  }
  return { workflow: raw as WorkflowDef };
}

/** Serialize for export/copy: workflow + UI metadata so import can restore diagram */
export function serializeForExport(
  workflow: WorkflowDef,
  nodes: Node<StepNodeData>[],
  edges: Edge[]
): string {
  const stepNodes = nodes.filter(
    (n) => n.data && typeof n.data === "object" && "stepType" in n.data
  );
  const out: WorkflowExportFormat = {
    workflow,
    ui: {
      nodes: stepNodes.map((n) => ({
        id: n.id,
        type: (n.type as string) ?? (n.data as StepNodeData).stepType,
        position: n.position ?? { x: 0, y: 0 },
        data: n.data as Record<string, unknown>,
      })),
      edges: edges.map((e, i) => ({
        id: e.id ?? `e${i}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        data: e.data ? { label: (e.data as { label?: string }).label } : undefined,
      })),
    },
  };
  return JSON.stringify(out, null, 2);
}

/** Plain workflow JSON only (gosample shape, no UI) */
export function serializeWorkflowOnly(workflow: WorkflowDef): string {
  const out: WorkflowDef = {
    version: workflow.version,
    steps: workflow.steps,
  };
  if (Object.keys(workflow.steps).length > 0 && workflow.startStepId != null) {
    out.startStepId = workflow.startStepId;
  }
  return JSON.stringify(out);
}

/** Build nodes and edges from workflow definition with simple auto-layout (BFS from start) */
export function flowFromWorkflow(def: WorkflowDef): {
  nodes: Node<StepNodeData>[];
  edges: Edge[];
} {
  const steps = def.steps ?? {};
  const stepIds = Object.keys(steps);
  if (stepIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  const startId = def.startStepId ?? stepIds[0];
  const depth = new Map<string, number>();
  const queue: string[] = [startId];
  depth.set(startId, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const step = steps[id];
    if (!step) continue;
    const d = depth.get(id) ?? 0;
    const nextIds: string[] = [];
    if (step.nextStepId) nextIds.push(step.nextStepId);
    if (step.thenStepId) nextIds.push(step.thenStepId);
    if (step.elseStepId) nextIds.push(step.elseStepId);
    if (step.timeoutStepId) nextIds.push(step.timeoutStepId);
    if (step.onFailureStepId) nextIds.push(step.onFailureStepId);
    if (step.type === "parallel" && step.branchStepIds) {
      nextIds.push(...step.branchStepIds);
    }
    for (const nid of nextIds) {
      if (!depth.has(nid)) {
        depth.set(nid, d + 1);
        queue.push(nid);
      }
    }
  }
  for (const id of stepIds) {
    if (!depth.has(id)) depth.set(id, 0);
  }

  const byDepth = new Map<number, string[]>();
  for (const id of stepIds) {
    const d = depth.get(id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }
  for (const arr of byDepth.values()) arr.sort();

  const DX = 220;
  const DY = 120;
  const nodePositions = new Map<string, { x: number; y: number }>();
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const d of depths) {
    const ids = byDepth.get(d) ?? [];
    ids.forEach((id, col) => {
      nodePositions.set(id, { x: col * DX, y: d * DY });
    });
  }

  const nodes: Node<StepNodeData>[] = stepIds.map((id) => {
    const step = steps[id] as StepDef;
    const position = nodePositions.get(id) ?? { x: 0, y: 0 };
    const data = stepDefToNodeData(id, step);
    return {
      id,
      type: step.type as "activity" | "condition" | "signal",
      position,
      data,
    };
  });

  const edges: Edge[] = [];
  for (const id of stepIds) {
    const step = steps[id] as StepDef;
    if (step.type === "parallel" && step.branchStepIds) {
      // For parallel steps, create edges to each branch
      // Use numbered branch handles to match ParallelNode component
      step.branchStepIds.forEach((branchId, index) => {
        if (stepIds.includes(branchId)) {
          edges.push({
            id: `e-${id}-branch-${branchId}`,
            source: id,
            target: branchId,
            sourceHandle: `branch-${index}`,
            data: { label: "branch" },
          });
        }
      });
      if (step.nextStepId && stepIds.includes(step.nextStepId)) {
        edges.push({
          id: `e-${id}-next-${step.nextStepId}`,
          source: id,
          target: step.nextStepId,
          sourceHandle: "next",
          data: { label: "next" },
        });
      }
      if (step.onFailureStepId && stepIds.includes(step.onFailureStepId)) {
        edges.push({
          id: `e-${id}-onFailure-${step.onFailureStepId}`,
          source: id,
          target: step.onFailureStepId,
          sourceHandle: "onFailure",
          data: { label: "onFailure" },
        });
      }
    } else {
      // Regular step edges
      if (step.nextStepId && stepIds.includes(step.nextStepId)) {
        edges.push({
          id: `e-${id}-next-${step.nextStepId}`,
          source: id,
          target: step.nextStepId,
          sourceHandle: "next",
          data: { label: "next" },
        });
      }
      if (step.onFailureStepId && stepIds.includes(step.onFailureStepId)) {
        edges.push({
          id: `e-${id}-onFailure-${step.onFailureStepId}`,
          source: id,
          target: step.onFailureStepId,
          sourceHandle: "onFailure",
          data: { label: "onFailure" },
        });
      }
      if (step.thenStepId && stepIds.includes(step.thenStepId)) {
        edges.push({
          id: `e-${id}-then-${step.thenStepId}`,
          source: id,
          target: step.thenStepId,
          sourceHandle: "then",
          data: { label: "then" },
        });
      }
      if (step.elseStepId && stepIds.includes(step.elseStepId)) {
        edges.push({
          id: `e-${id}-else-${step.elseStepId}`,
          source: id,
          target: step.elseStepId,
          sourceHandle: "else",
          data: { label: "else" },
        });
      }
      if (step.timeoutStepId && stepIds.includes(step.timeoutStepId)) {
        edges.push({
          id: `e-${id}-timeout-${step.timeoutStepId}`,
          source: id,
          target: step.timeoutStepId,
          sourceHandle: "timeout",
          data: { label: "timeout" },
        });
      }
    }
  }

  return { nodes, edges };
}

function stepDefToNodeData(stepId: string, step: StepDef): StepNodeData {
  const base = { stepId, stepType: step.type };
  if (step.type === "activity") {
    return {
      ...base,
      stepType: "activity",
      name: step.name ?? "",
      input: step.input,
      nextStepId: step.nextStepId ?? null,
      onFailureStepId: step.onFailureStepId ?? null,
      timeoutSeconds: step.timeoutSeconds ?? null,
      retryPolicy: step.retryPolicy ?? null,
    } as StepNodeData;
  }
  if (step.type === "condition") {
    return {
      ...base,
      stepType: "condition",
      left: step.left ?? null,
      operator: step.operator ?? "eq",
      right: step.right ?? null,
      thenStepId: step.thenStepId ?? null,
      elseStepId: step.elseStepId ?? null,
    } as StepNodeData;
  }
  if (step.type === "signal") {
    return {
      ...base,
      stepType: "signal",
      signalName: step.signalName ?? "",
      signalTimeoutSeconds: step.signalTimeoutSeconds ?? 60,
      nextStepId: step.nextStepId ?? null,
      timeoutStepId: step.timeoutStepId ?? null,
    } as StepNodeData;
  }
  if (step.type === "parallel") {
    return {
      ...base,
      stepType: "parallel",
      branchStepIds: step.branchStepIds ?? [],
      join: (step.join as "all" | "any") ?? "all",
      nextStepId: step.nextStepId ?? null,
      onFailureStepId: step.onFailureStepId ?? null,
    } as StepNodeData;
  }
  return { ...base, stepType: "activity", name: "" } as StepNodeData;
}

/** Apply serialized UI (nodes/edges) to React Flow shape; validate ids match workflow steps */
export function uiToFlow(ui: { nodes: SerializedNode[]; edges: SerializedEdge[] }): {
  nodes: Node<StepNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<StepNodeData>[] = ui.nodes.map((n) => ({
    id: n.id,
    type: (n.type as "activity" | "condition" | "signal") ?? "activity",
    position: n.position ?? { x: 0, y: 0 },
    data: n.data as StepNodeData,
  }));
  const edges: Edge[] = ui.edges.map((e, i) => ({
    id: e.id ?? `e${i}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    data: e.data ?? {},
  }));
  return { nodes, edges };
}
