"use client";

import { useState, useCallback } from "react";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import { parseImportJson, flowFromWorkflow, uiToFlow } from "@/lib/workflow/importExport";
import { validate } from "@/lib/workflow/validate";
import { setStepIdCounterMin } from "@/utils/ids";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { setNodes, setEdges } = useWorkflowCanvasContext();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOk = useCallback(() => {
    setError(null);
    let parsed: { workflow: import("@/lib/workflow/types").WorkflowDef; ui?: { nodes: import("@/lib/workflow/importExport").SerializedNode[]; edges: import("@/lib/workflow/importExport").SerializedEdge[] } };
    try {
      parsed = parseImportJson(text);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const { workflow, ui } = parsed;
    if (!workflow?.steps || typeof workflow.steps !== "object") {
      setError("Missing workflow.steps");
      return;
    }
    const err = validate(workflow, { allowUnreachable: true });
    if (err) {
      setError(err);
      return;
    }
    if (ui?.nodes?.length) {
      const { nodes, edges } = uiToFlow(ui);
      setNodes(nodes);
      setEdges(edges);
    } else {
      const { nodes, edges } = flowFromWorkflow(workflow);
      setNodes(nodes);
      setEdges(edges);
    }
    const stepIds = Object.keys(workflow.steps);
    const maxSuffix = stepIds.reduce((max, id) => {
      const m = id.match(/_(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    setStepIdCounterMin(maxSuffix);
    setText("");
    onClose();
  }, [text, setNodes, setEdges, onClose]);

  const handleClose = useCallback(() => {
    setError(null);
    setText("");
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Import workflow JSON</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste workflow JSON (with or without UI metadata). Exported/copied JSON from this editor includes layout so the diagram is restored.
          </p>
        </div>
        <div className="flex-1 min-h-0 p-4 flex flex-col gap-2">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1.5 rounded">
              {error}
            </div>
          )}
          <textarea
            className="w-full flex-1 min-h-[200px] rounded border border-gray-300 dark:border-gray-600 bg-background px-2 py-1.5 text-sm font-mono resize-none"
            placeholder='{"workflow": { "version": "1.0", "startStepId": "...", "steps": { ... } }, "ui": { "nodes": [...], "edges": [...] } }'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOk}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
