import type { ActivityDefinition } from "./types";

/**
 * Add to List activity: requests email and name as inputs.
 * Register in gosample as RegisterNamedActivity("AddToList", AddToList) and add to activitiesConfig.
 */
export const addToListActivity: ActivityDefinition = {
  name: "AddToList",
  label: "Add to List",
  description: "Add an item to a list with email and name.",
  icon: "ListPlus",
  enabled: true,
  outgoingActions: [{ id: "next", label: "Send email" }],
  inputFields: [
    { key: "email", label: "Email", type: "text", placeholder: "e.g. user@example.com" },
    { key: "name", label: "Name", type: "json", placeholder: "e.g. Jane Doe" },
  ],
};
