"use client";

import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { StepNodeData } from "@/types/editor";
import { buildWorkflowFromFlow } from "@/lib/workflow/build";
import { validate } from "@/lib/workflow/validate";
import { serializeForExport } from "@/lib/workflow/importExport";

export interface ExportResult {
  success: boolean;
  json?: string;
  error?: string;
}

export function useExportWorkflow(
  nodes: Node<StepNodeData>[],
  edges: Edge[]
) {
  const exportWorkflow = useCallback((): ExportResult => {
    const def = buildWorkflowFromFlow(nodes, edges);
    const err = validate(def, { allowUnreachable: true });
    if (err) return { success: false, error: err };
    const json = serializeForExport(def, nodes, edges);
    return { success: true, json };
  }, [nodes, edges]);

  const downloadJson = useCallback(() => {
    const result = exportWorkflow();
    if (!result.success || !result.json) return result;
    const blob = new Blob([result.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
    return result;
  }, [exportWorkflow]);

  const copyToClipboard = useCallback(async () => {
    const result = exportWorkflow();
    if (!result.success || !result.json) return result;
    await navigator.clipboard.writeText(result.json);
    return result;
  }, [exportWorkflow]);

  return { exportWorkflow, downloadJson, copyToClipboard };
}
