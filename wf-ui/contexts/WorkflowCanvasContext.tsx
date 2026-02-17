"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { StepNodeData } from "@/types/editor";
import type { StepType } from "@/types/editor";
import { generateStepId } from "@/utils/ids";
import { ACTIVITIES } from "@/lib/activities";
import type { ActivityNodeData, ConditionNodeData, SignalNodeData } from "@/types/editor";

interface WorkflowCanvasContextValue {
  nodes: Node<StepNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<StepNodeData>[]>>;
  onNodesChange: (changes: import("@xyflow/react").NodeChange<Node<StepNodeData>>[]) => void;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onEdgesChange: (changes: import("@xyflow/react").EdgeChange[]) => void;
  /** When stepType is "activity", activityName must be the activity's name from ACTIVITIES */
  addNode: (stepType: StepType, position: { x: number; y: number }, activityName?: string) => string;
  updateNodeData: (nodeId: string, data: Partial<StepNodeData>) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

const WorkflowCanvasContext = createContext<WorkflowCanvasContextValue | null>(null);

export function WorkflowCanvasProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const addNode = useCallback(
    (stepType: StepType, position: { x: number; y: number }, activityName?: string): string => {
      const stepId = generateStepId(stepType);
      let data: StepNodeData;
      if (stepType === "activity") {
        const name = activityName ?? ACTIVITIES[0]?.name ?? "";
        data = {
          stepType: "activity",
          stepId,
          name,
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

  const value: WorkflowCanvasContextValue = {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    addNode,
    updateNodeData,
    selectedNodeId,
    setSelectedNodeId,
  };

  return (
    <WorkflowCanvasContext.Provider value={value}>
      {children}
    </WorkflowCanvasContext.Provider>
  );
}

export function useWorkflowCanvasContext() {
  const ctx = useContext(WorkflowCanvasContext);
  if (!ctx) throw new Error("useWorkflowCanvasContext must be used within WorkflowCanvasProvider");
  return ctx;
}
