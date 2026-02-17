"use client";

import type { NodeProps } from "@xyflow/react";
import type { ConditionNodeData } from "@/types/editor";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function ConditionNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const d = data as unknown as ConditionNodeData;
  return (
    <div
      className={`px-3 py-2 rounded-md border-2 min-w-[120px] bg-background ${
        selected ? "border-amber-500" : "border-amber-400"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-600" />
      <div className="text-xs text-muted-foreground">Condition</div>
      <div className="font-medium text-sm">{d.operator || "eq"}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="then"
        className="!w-2 !h-2 !bg-green-500 !top-1/3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="else"
        className="!w-2 !h-2 !bg-red-500 !top-2/3"
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
