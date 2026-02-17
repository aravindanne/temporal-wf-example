"use client";

import { BlockPalette } from "@/components/palette/BlockPalette";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { ExportToolbar } from "@/components/layout/ExportToolbar";
import { WorkflowCanvasProvider } from "@/contexts/WorkflowCanvasContext";

export function EditorLayout() {
  return (
    <WorkflowCanvasProvider>
      <div className="flex flex-col flex-1 min-h-0">
        <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 flex-shrink-0">
          <h1 className="text-lg font-semibold">Workflow Editor</h1>
          <ExportToolbar />
        </header>
        <div className="flex flex-1 min-h-0">
          <aside className="w-56 border-r bg-muted/30 flex-shrink-0 p-3 overflow-auto">
            <BlockPalette />
          </aside>
          <section className="flex-1 min-w-0 min-h-0">
            <FlowCanvas />
          </section>
          <aside className="w-80 border-l bg-muted/30 flex-shrink-0 overflow-auto">
            <PropertiesPanel />
          </aside>
        </div>
      </div>
    </WorkflowCanvasProvider>
  );
}
