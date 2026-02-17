/**
 * Activity definition: one file per activity under lib/activities/ implements this.
 * Add name, label, and inputFields (or a custom PropertiesComponent) so the palette
 * and properties panel are driven from this single source.
 */

import type { ValueRef } from "@/lib/workflow/types";

export type ActivityInputFieldType = "text" | "number" | "json" | "valueRef";

export interface ActivityInputField {
  key: string;
  label: string;
  type: ActivityInputFieldType;
  placeholder?: string;
}

/** Outgoing edge from an activity; id maps to nextStepId ("next") or onFailureStepId ("onFailure") in workflow JSON */
export interface OutgoingAction {
  id: string;
  /** Shown on hover over the connection dot; omit for no tooltip */
  label?: string;
}

export interface ActivityDefinition {
  /** Must match gosample RegisterNamedActivity name */
  name: string;
  /** Display name in palette and node */
  label: string;
  /** Short description shown in palette (and searchable) */
  description?: string;
  /** Lucide icon name (e.g. "CheckCircle", "Mail") – add to iconMap.tsx if new */
  icon?: string;
  /** If false, activity is not shown in the palette (default true) */
  enabled?: boolean;
  /** Outgoing connection(s); each gets a dot. If empty/omitted, one dot (no label on hover). Use id "next" or "onFailure" for workflow JSON */
  outgoingActions?: OutgoingAction[];
  /** Fields to render in the properties panel; builds node.data.input */
  inputFields?: ActivityInputField[];
}

/** Built input value for one field: literal or ValueRef */
export type ActivityFieldValue = string | number | ValueRef | Record<string, unknown>;
