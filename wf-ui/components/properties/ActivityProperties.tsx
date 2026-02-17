"use client";

import { useState, useRef, useEffect } from "react";
import { getActivityByName } from "@/lib/activities";
import { getActivityIcon } from "@/lib/activities/iconMap";
import type { ActivityInputFieldType } from "@/lib/activities";
import type { ValueRef } from "@/lib/workflow/types";
import type { ActivityNodeData } from "@/types/editor";
import { useWorkflowCanvasContext } from "@/contexts/WorkflowCanvasContext";
import { ValueRefForm } from "./ValueRefForm";

interface ActivityPropertiesProps {
  nodeId: string;
  data: ActivityNodeData;
}

export function ActivityProperties({ nodeId, data }: ActivityPropertiesProps) {
  const { updateNodeData, nodes } = useWorkflowCanvasContext();
  const stepIds = nodes.map((n) => n.id).filter((id) => id !== nodeId);
  const definition = getActivityByName(data.name ?? "");
  const inputObj = (data.input != null && typeof data.input === "object" && !Array.isArray(data.input)
    ? data.input
    : {}) as Record<string, unknown>;

  const setInputField = (key: string, value: unknown) => {
    const next = { ...inputObj };
    if (value === undefined || value === null) delete next[key];
    else next[key] = value;
    updateNodeData(nodeId, { input: next });
  };

  const ActivityIcon = definition?.icon ? getActivityIcon(definition.icon) : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Activity</label>
        <div className="flex items-center gap-2">
          {ActivityIcon ? <ActivityIcon className="h-4 w-4 text-muted-foreground" /> : null}
          <p className="text-sm font-medium">{definition?.label ?? data.name ?? "—"}</p>
        </div>
        {definition?.description ? (
          <p className="text-xs text-muted-foreground mt-1">{definition.description}</p>
        ) : null}
      </div>

      {definition?.inputFields?.length ? (
        definition.inputFields.map((field) => (
          <ActivityInputField
            key={field.key}
            field={field}
            value={inputObj[field.key]}
            stepIds={stepIds}
            setValue={(v) => setInputField(field.key, v)}
          />
        ))
      ) : (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Input (JSON)</label>
          <textarea
            className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm font-mono min-h-[80px]"
            placeholder='{"key": {"type": "input"}}'
            value={
              data.input != null && typeof data.input === "object"
                ? JSON.stringify(data.input, null, 2)
                : typeof data.input === "string"
                  ? data.input
                  : ""
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                updateNodeData(nodeId, { input: undefined });
                return;
              }
              try {
                updateNodeData(nodeId, { input: JSON.parse(raw) });
              } catch {
                // leave as-is on parse error
              }
            }}
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Timeout (seconds)</label>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={data.timeoutSeconds ?? ""}
          placeholder="Optional"
          onChange={(e) => {
            const v = e.target.value;
            updateNodeData(nodeId, {
              timeoutSeconds: v === "" ? undefined : parseInt(v, 10) || undefined,
            });
          }}
        />
      </div>
    </div>
  );
}

function ActivityInputField({
  field,
  value,
  stepIds,
  setValue,
}: {
  field: { key: string; label: string; type: ActivityInputFieldType; placeholder?: string };
  value: unknown;
  stepIds: string[];
  setValue: (v: unknown) => void;
}) {
  const type = field.type;

  if (type === "valueRef") {
    const v = (value != null && typeof value === "object" && "type" in value
      ? value
      : null) as ValueRef | null;
    return (
      <ValueRefForm
        label={field.label}
        value={v}
        onChange={(ref) => setValue(ref ?? undefined)}
        stepIds={stepIds}
      />
    );
  }

  if (type === "text") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">{field.label}</label>
        <input
          type="text"
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value || undefined)}
        />
      </div>
    );
  }

  if (type === "number") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">{field.label}</label>
        <input
          type="number"
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          placeholder={field.placeholder}
          value={typeof value === "number" ? value : value != null ? String(value) : ""}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v === "" ? undefined : Number(v));
          }}
        />
      </div>
    );
  }

  if (type === "json") {
    return (
      <JsonField
        label={field.label}
        placeholder={field.placeholder ?? "{}"}
        value={value}
        setValue={setValue}
      />
    );
  }

  return null;
}

function jsonDisplayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return JSON.stringify(value);
}

function JsonField({
  label,
  placeholder,
  value,
  setValue,
}: {
  label: string;
  placeholder: string;
  value: unknown;
  setValue: (v: unknown) => void;
}) {
  const [local, setLocal] = useState(() => jsonDisplayValue(value));
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setLocal(jsonDisplayValue(value));
    }
  }, [value]);

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <textarea
        className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm font-mono min-h-[60px]"
        placeholder={placeholder}
        value={local}
        onChange={(e) => {
          const raw = e.target.value;
          setLocal(raw);
          const trimmed = raw.trim();
          if (!trimmed) {
            setValue(undefined);
            return;
          }
          try {
            setValue(JSON.parse(trimmed));
          } catch {
            // keep local as-is; don't commit invalid JSON
          }
        }}
      />
    </div>
  );
}
