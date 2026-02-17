import type { ActivityDefinition } from "./types";

export const validateInputActivity: ActivityDefinition = {
  name: "ValidateInput",
  label: "Validate Input",
  description: "Validate workflow input or step result; returns valid/error.",
  icon: "CheckCircle",
  enabled: true,
  inputFields: [
    { key: "input", label: "Input data", type: "valueRef", placeholder: "Workflow input or step result" },
  ],
};
