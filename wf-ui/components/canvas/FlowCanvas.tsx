"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  addEdge,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import { nodeTypes } from "@/lib/react-flow/nodeTypes";
import { DRAG_TYPE } from "@/components/palette/BlockPalette";
import type { PaletteDragPayload } from "@/components/palette/BlockPalette";
import "@xyflow/react/dist/style.css";

function FlowCanvasInner() {
  const {
    nodes,
    setEdges,
    onNodesChange,
    edges,
    onEdgesChange,
    addNode,
    setSelectedNodeId,
  } = useWorkflowCanvasContext();
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      let payload: PaletteDragPayload;
      try {
        payload = JSON.parse(e.dataTransfer.getData(DRAG_TYPE) || "{}") as PaletteDragPayload;
      } catch {
        return;
      }
      const stepType = payload.stepType;
      if (!stepType || !["activity", "condition", "signal"].includes(stepType)) return;
      if (stepType === "activity" && !("activityName" in payload && payload.activityName)) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(stepType, position, stepType === "activity" ? payload.activityName : undefined);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onSelectionChange = useCallback(
    (params: { nodes: typeof nodes }) => {
      const selected = params.nodes.find((n) => n.selected);
      setSelectedNodeId(selected?.id ?? null);
    },
    [setSelectedNodeId]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = (connection.sourceHandle ?? "next") as string;
      setEdges((eds) =>
        addEdge(
          { ...connection, data: { label } as Edge["data"] },
          eds
        )
      );
    },
    [setEdges]
  );

  const flowProps = {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onDrop,
    onDragOver,
    onSelectionChange,
    onConnect,
    nodeTypes,
    fitView: true,
    className: "bg-muted/20",
  };

  return (
    <ReactFlow {...(flowProps as unknown as React.ComponentProps<typeof ReactFlow>)}>
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
