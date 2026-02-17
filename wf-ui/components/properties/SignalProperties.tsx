"use client";

import { MinSignalTimeoutSeconds, MaxSignalTimeoutSeconds } from "@/lib/workflow/types";
import type { SignalNodeData } from "@/types/editor";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";

interface SignalPropertiesProps {
  nodeId: string;
  data: SignalNodeData;
}

export function SignalProperties({ nodeId, data }: SignalPropertiesProps) {
  const { updateNodeData, nodes } = useWorkflowCanvasContext();
  const stepIds = nodes.map((n) => n.id).filter((id) => id !== nodeId);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Signal name</label>
        <input
          type="text"
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.signalName ?? ""}
          placeholder="e.g. email_outcome"
          onChange={(e) => updateNodeData(nodeId, { signalName: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Timeout (seconds, {MinSignalTimeoutSeconds}–{MaxSignalTimeoutSeconds})
        </label>
        <input
          type="number"
          min={MinSignalTimeoutSeconds}
          max={MaxSignalTimeoutSeconds}
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.signalTimeoutSeconds ?? 60}
          onChange={(e) =>
            updateNodeData(nodeId, {
              signalTimeoutSeconds: Math.min(
                MaxSignalTimeoutSeconds,
                Math.max(MinSignalTimeoutSeconds, parseInt(e.target.value, 10) || 60)
              ),
            })
          }
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Next step (on signal)</label>
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.nextStepId ?? ""}
          onChange={(e) => updateNodeData(nodeId, { nextStepId: e.target.value || null })}
        >
          <option value="">Select step</option>
          {stepIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Timeout step</label>
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.timeoutStepId ?? ""}
          onChange={(e) => updateNodeData(nodeId, { timeoutStepId: e.target.value || null })}
        >
          <option value="">Select step</option>
          {stepIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
