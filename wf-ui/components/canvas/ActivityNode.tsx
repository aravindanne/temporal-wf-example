"use client";

import type { NodeProps } from "@xyflow/react";
import type { ActivityNodeData } from "@/types/editor";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { getActivityByName } from "@/lib/activities";

function ActivityNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const d = data as unknown as ActivityNodeData;
  const definition = getActivityByName(d.name ?? "");
  const actions = definition?.outgoingActions;

  const handles =
    actions && actions.length > 0
      ? actions
      : [{ id: "next" as string, label: undefined as string | undefined }];

  return (
    <div
      className={`px-3 py-2 rounded-md border-2 min-w-[120px] bg-background ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500" />
      <div className="text-xs text-muted-foreground">Activity</div>
      <div className="font-medium text-sm">{d.name || "(no name)"}</div>
      {handles.map((action, i) => (
        <Handle
          key={action.id}
          type="source"
          position={Position.Right}
          id={action.id}
          title={action.label ?? undefined}
          className="!w-2 !h-2 !bg-gray-500"
          style={{
            top: handles.length === 1 ? "50%" : `${((i + 1) / (handles.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

export const ActivityNode = memo(ActivityNodeComponent);
