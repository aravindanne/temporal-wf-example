"use client";

import { useState } from "react";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import { useExportWorkflow } from "@/hooks/useExportWorkflow";
import { Download, Copy, Upload } from "lucide-react";
import { ImportDialog } from "@/components/layout/ImportDialog";

export function ExportToolbar() {
  const { nodes, edges } = useWorkflowCanvasContext();
  const { downloadJson, copyToClipboard } = useExportWorkflow(nodes, edges);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleDownload = () => {
    setError(null);
    const result = downloadJson();
    if (!result.success) setError(result.error ?? "Export failed");
  };

  const handleCopy = async () => {
    setError(null);
    setCopied(false);
    const result = await copyToClipboard();
    if (!result.success) setError(result.error ?? "Export failed");
    else setCopied(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-sm text-red-600 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Upload className="h-4 w-4" />
          Import JSON
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
