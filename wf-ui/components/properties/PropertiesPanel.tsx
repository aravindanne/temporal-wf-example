"use client";

import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import type { StepNodeData } from "@/types/editor";
import { ActivityProperties } from "./ActivityProperties";
import { ConditionProperties } from "./ConditionProperties";
import { SignalProperties } from "./SignalProperties";
import { ParallelProperties } from "./ParallelProperties";

export function PropertiesPanel() {
  const { selectedNodeId, nodes } = useWorkflowCanvasContext();
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const data = selectedNode?.data as StepNodeData | undefined;

  return (
    <div className="p-3">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2">Properties</h2>
      {!selectedNode ? (
        <p className="text-sm text-muted-foreground">Select a node to edit</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">Step ID: {selectedNode.id}</p>
          {data?.stepType === "activity" && (
            <ActivityProperties nodeId={selectedNode.id} data={data} />
          )}
          {data?.stepType === "condition" && (
            <ConditionProperties nodeId={selectedNode.id} data={data} />
          )}
          {data?.stepType === "signal" && (
            <SignalProperties nodeId={selectedNode.id} data={data} />
          )}
          {data?.stepType === "parallel" && (
            <ParallelProperties nodeId={selectedNode.id} data={data} />
          )}
        </>
      )}
    </div>
  );
}
