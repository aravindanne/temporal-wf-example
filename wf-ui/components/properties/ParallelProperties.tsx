"use client";

import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import type { ParallelNodeData } from "@/types/editor";

interface ParallelPropertiesProps {
  nodeId: string;
  data: ParallelNodeData;
}

export function ParallelProperties({ nodeId, data }: ParallelPropertiesProps) {
  const { updateNodeData } = useWorkflowCanvasContext();

  const handleJoinChange = (join: "all" | "any") => {
    updateNodeData(nodeId, { ...data, join });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Join Strategy</label>
        <select
          value={data.join ?? "all"}
          onChange={(e) => handleJoinChange(e.target.value as "all" | "any")}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="all">All (wait for all branches)</option>
          <option value="any">Any (proceed on first completion)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {data.join === "all"
            ? "Waits for all branches to complete before proceeding"
            : "Proceeds when the first branch completes"}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Branches</label>
        <div className="text-sm text-muted-foreground">
          {data.branchStepIds && data.branchStepIds.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {data.branchStepIds.map((branchId, i) => (
                <li key={branchId}>
                  Branch {i + 1}: <code className="text-xs">{branchId}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs">No branches defined. Connect edges from this node to create branches.</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Next Step</label>
        <input
          type="text"
          value={data.nextStepId ?? ""}
          onChange={(e) =>
            updateNodeData(nodeId, {
              ...data,
              nextStepId: e.target.value || null,
            })
          }
          placeholder="Step ID after parallel completes"
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">On Failure Step (optional)</label>
        <input
          type="text"
          value={data.onFailureStepId ?? ""}
          onChange={(e) =>
            updateNodeData(nodeId, {
              ...data,
              onFailureStepId: e.target.value || null,
            })
          }
          placeholder="Step ID if parallel fails"
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
}
