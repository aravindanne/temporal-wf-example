"use client";

import { CONDITION_OPERATORS } from "@/lib/workflow/types";
import type { ConditionNodeData } from "@/types/editor";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import { ValueRefForm } from "./ValueRefForm";

interface ConditionPropertiesProps {
  nodeId: string;
  data: ConditionNodeData;
}

export function ConditionProperties({ nodeId, data }: ConditionPropertiesProps) {
  const { updateNodeData, nodes } = useWorkflowCanvasContext();
  const stepIds = nodes.map((n) => n.id).filter((id) => id !== nodeId);
  const needsRight = data.operator && data.operator !== "exists" && data.operator !== "isEmpty";

  return (
    <div className="space-y-3">
      <ValueRefForm
        label="Left operand"
        value={data.left ?? null}
        onChange={(v) => updateNodeData(nodeId, { left: v })}
        stepIds={stepIds}
      />
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Operator</label>
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.operator ?? "eq"}
          onChange={(e) => updateNodeData(nodeId, { operator: e.target.value })}
        >
          {CONDITION_OPERATORS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>
      {needsRight && (
        <ValueRefForm
          label="Right operand"
          value={data.right ?? null}
          onChange={(v) => updateNodeData(nodeId, { right: v })}
          stepIds={stepIds}
        />
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Then step</label>
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.thenStepId ?? ""}
          onChange={(e) =>
            updateNodeData(nodeId, { thenStepId: e.target.value || null })
          }
        >
          <option value="">(end)</option>
          {stepIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Else step</label>
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.elseStepId ?? ""}
          onChange={(e) =>
            updateNodeData(nodeId, { elseStepId: e.target.value || null })
          }
        >
          <option value="">(end)</option>
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
