/**
 * Activity registry. Activities are defined in activitiesConfig.ts.
 * Only entries with enabled !== false are shown in the UI.
 *
 * To add a new activity: edit lib/activities/activitiesConfig.ts and add one object to ACTIVITIES_CONFIG.
 * If you use a new icon, add it to lib/activities/iconMap.tsx.
 */

import type { ActivityDefinition } from "./types";
import { ACTIVITIES_CONFIG } from "./activitiesConfig";

/** Activities visible in the UI (enabled !== false) */
export const ACTIVITIES: ActivityDefinition[] = ACTIVITIES_CONFIG.filter(
  (a) => a.enabled !== false
);

export type {
  ActivityDefinition,
  ActivityInputField,
  ActivityInputFieldType,
  OutgoingAction,
} from "./types";

/** Resolve definition by name (includes disabled activities so canvas nodes keep correct handles) */
export function getActivityByName(name: string): ActivityDefinition | undefined {
  return ACTIVITIES_CONFIG.find((a) => a.name === name);
}

export function isActivityRegistered(name: string): boolean {
  return ACTIVITIES.some((a) => a.name === name);
}
