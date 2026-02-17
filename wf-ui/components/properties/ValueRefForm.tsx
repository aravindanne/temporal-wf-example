"use client";

import type { ValueRef } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const VALUE_REF_LITERAL = "literal";
const VALUE_REF_INPUT = "input";
const VALUE_REF_STEP_RESULT = "stepResult";

interface ValueRefFormProps {
  value: ValueRef | null | undefined;
  onChange: (v: ValueRef | null) => void;
  stepIds: string[];
  label?: string;
  className?: string;
}

export function ValueRefForm(props: ValueRefFormProps) {
  const { value, onChange, stepIds, label, className } = props;
  const type = value?.type ?? "literal";

  const literalValue =
    typeof value?.value === "string"
      ? value.value
      : value?.value != null
        ? JSON.stringify(value.value)
        : "";

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value;
    if (t === VALUE_REF_LITERAL) onChange({ type: "literal", value: null });
    else if (t === VALUE_REF_INPUT) onChange({ type: "input" });
    else if (t === VALUE_REF_STEP_RESULT) onChange({ type: "stepResult", stepId: stepIds[0] ?? "" });
  };

  const handleLiteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    let val: unknown = raw;
    if (raw === "") val = null;
    else if (raw === "true") val = true;
    else if (raw === "false") val = false;
    else if (!isNaN(Number(raw))) val = Number(raw);
    else {
      try {
        val = JSON.parse(raw);
      } catch {
        val = raw;
      }
    }
    onChange({ type: "literal", value: val });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      ) : null}
      <div className="flex flex-col gap-2">
        <select
          className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
          value={type}
          onChange={handleTypeChange}
        >
          <option value={VALUE_REF_LITERAL}>Literal</option>
          <option value={VALUE_REF_INPUT}>Workflow input</option>
          <option value={VALUE_REF_STEP_RESULT}>Step result</option>
        </select>
        {type === VALUE_REF_LITERAL ? (
          <input
            className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
            placeholder='JSON value (e.g. true, 42, "hello")'
            value={literalValue}
            onChange={handleLiteralChange}
          />
        ) : null}
        {type === VALUE_REF_INPUT ? (
          <input
            className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
            placeholder="Path (e.g. $.userId, optional)"
            value={value?.path ?? ""}
            onChange={(e) => onChange({ type: "input", path: e.target.value || undefined })}
          />
        ) : null}
        {type === VALUE_REF_STEP_RESULT ? (
          <>
            <select
              className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
              value={value?.stepId ?? ""}
              onChange={(e) =>
                onChange({
                  type: "stepResult",
                  stepId: e.target.value,
                  path: value?.path,
                })
              }
            >
              <option value="">Select step</option>
              {stepIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded border border-gray-300 bg-background px-2 py-1.5 text-sm"
              placeholder="Path (e.g. $.valid, optional)"
              value={value?.path ?? ""}
              onChange={(e) =>
                onChange({
                  type: "stepResult",
                  stepId: value?.stepId ?? "",
                  path: e.target.value || undefined,
                })
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
