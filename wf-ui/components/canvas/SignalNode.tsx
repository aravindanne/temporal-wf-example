"use client";

import type { NodeProps } from "@xyflow/react";
import type { SignalNodeData } from "@/types/editor";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function SignalNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const d = data as unknown as SignalNodeData;
  return (
    <div
      className={`px-3 py-2 rounded-md border-2 min-w-[120px] bg-background ${
        selected ? "border-purple-500" : "border-purple-400"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-purple-600" />
      <div className="text-xs text-muted-foreground">Signal</div>
      <div className="font-medium text-sm truncate">{d.signalName || "(no name)"}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="next"
        className="!w-2 !h-2 !bg-purple-600 !top-1/3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="timeout"
        className="!w-2 !h-2 !bg-gray-500 !top-2/3"
      />
    </div>
  );
}

export const SignalNode = memo(SignalNodeComponent);
