import type { ActivityDefinition } from "./types";

export const greetActivity: ActivityDefinition = {
  name: "Greet",
  label: "Greet",
  description: "Return a greeting string (e.g. Hello World).",
  icon: "Smile",
  enabled: true,
  inputFields: [
    { key: "name", label: "Name", type: "text", placeholder: "e.g. World" },
  ],
};
