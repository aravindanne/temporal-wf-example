"use client";

import { useNodesState, useEdgesState, type Node, type Edge } from "@xyflow/react";
import { useCallback } from "react";
import type { StepNodeData, StepType, ActivityNodeData, ConditionNodeData, SignalNodeData } from "@/types/editor";
import { generateStepId } from "@/utils/ids";
import { ACTIVITY_NAMES } from "@/lib/activityRegistry";
export function useWorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const addNode = useCallback(
    (stepType: StepType, position: { x: number; y: number }): string => {
      const stepId = generateStepId(stepType);
      let data: StepNodeData;
      if (stepType === "activity") {
        data = {
          stepType: "activity",
          stepId,
          name: ACTIVITY_NAMES[0] ?? "",
        } as ActivityNodeData;
      } else if (stepType === "condition") {
        data = {
          stepType: "condition",
          stepId,
          operator: "eq",
        } as ConditionNodeData;
      } else {
        data = {
          stepType: "signal",
          stepId,
          signalName: "signal",
          signalTimeoutSeconds: 60,
        } as SignalNodeData;
      }
      const node: Node<StepNodeData> = {
        id: stepId,
        type: stepType,
        position,
        data,
      };
      setNodes((nds) => nds.concat(node));
      return stepId;
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<StepNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } as StepNodeData } : n))
      );
    },
    [setNodes]
  );

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    addNode,
    updateNodeData,
  };
}
