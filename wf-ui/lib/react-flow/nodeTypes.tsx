"use client";

import type { NodeTypes } from "@xyflow/react";
import { ActivityNode } from "@/components/canvas/ActivityNode";
import { ConditionNode } from "@/components/canvas/ConditionNode";
import { SignalNode } from "@/components/canvas/SignalNode";
import { ParallelNode } from "@/components/canvas/ParallelNode";

export const nodeTypes: NodeTypes = {
  activity: ActivityNode,
  condition: ConditionNode,
  signal: SignalNode,
  parallel: ParallelNode,
};
