import type { ActivityDefinition } from "./types";

export const processActivity: ActivityDefinition = {
  name: "Process",
  label: "Process",
  description: "Process data from a previous step or workflow input.",
  icon: "Loader",
  enabled: true,
  inputFields: [
    { key: "data", label: "Data to process", type: "valueRef", placeholder: "Step result or input" },
  ],
};
