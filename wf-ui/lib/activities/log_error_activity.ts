import type { ActivityDefinition } from "./types";

export const logErrorActivity: ActivityDefinition = {
  name: "LogError",
  label: "Log Error",
  description: "Log an error payload (e.g. from a step result).",
  icon: "AlertCircle",
  enabled: true,
  inputFields: [
    { key: "error", label: "Error payload", type: "valueRef", placeholder: "e.g. step result with path $.error" },
  ],
};
