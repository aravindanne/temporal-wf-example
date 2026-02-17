/**
 * Re-exports from activities registry for validation and backward compatibility.
 * Activity list is defined in lib/activities/ (one file per activity); index aggregates them.
 */

import { ACTIVITIES, isActivityRegistered as checkRegistered } from "@/lib/activities";

export const ACTIVITY_LIST = ACTIVITIES.map((a) => ({ name: a.name, label: a.label }));
export const ACTIVITY_NAMES = ACTIVITIES.map((a) => a.name);
export const isActivityRegistered = checkRegistered;
