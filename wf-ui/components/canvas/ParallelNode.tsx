"use client";

import type { NodeProps } from "@xyflow/react";
import type { ParallelNodeData } from "@/types/editor";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function ParallelNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const d = data as unknown as ParallelNodeData;
  const branchCount = d.branchStepIds?.length ?? 0;
  const joinLabel = d.join === "any" ? "Any" : "All";

  return (
    <div
      className={`px-3 py-2 rounded-md border-2 min-w-[140px] bg-background ${
        selected ? "border-blue-500" : "border-blue-400"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-blue-600" />
      <div className="text-xs text-muted-foreground">Parallel</div>
      <div className="font-medium text-sm">{joinLabel} ({branchCount} branches)</div>
      {/* Multiple branch handles */}
      {d.branchStepIds && d.branchStepIds.length > 0 && (
        <>
          {d.branchStepIds.map((_, i) => (
            <Handle
              key={`branch-${i}`}
              type="source"
              position={Position.Right}
              id={`branch-${i}`}
              className="!w-2 !h-2 !bg-blue-600"
              style={{
                top: `${((i + 1) / (d.branchStepIds!.length + 2)) * 100}%`,
              }}
            />
          ))}
        </>
      )}
      {/* Next handle at bottom */}
      <Handle
        type="source"
        position={Position.Right}
        id="next"
        className="!w-2 !h-2 !bg-gray-500"
        style={{
          top: "90%",
        }}
      />
      {/* OnFailure handle if needed */}
      {d.onFailureStepId && (
        <Handle
          type="source"
          position={Position.Right}
          id="onFailure"
          className="!w-2 !h-2 !bg-red-500"
          style={{
            top: "95%",
          }}
        />
      )}
    </div>
  );
}

export const ParallelNode = memo(ParallelNodeComponent);
