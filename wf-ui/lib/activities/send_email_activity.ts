import type { ActivityDefinition } from "./types";

export const sendEmailActivity: ActivityDefinition = {
  name: "SendEmail",
  label: "Send Email",
  description: "Send email; outcome can be received via signal.",
  icon: "Mail",
  enabled: true,
  inputFields: [
    { key: "payload", label: "Email payload", type: "valueRef", placeholder: "e.g. workflow input" },
  ],
};
