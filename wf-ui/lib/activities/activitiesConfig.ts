/**
 * Config: register all activity definition files here.
 * Each activity is defined in its own file (e.g. add_to_list_activity.ts) with name, label,
 * description, icon, enabled, and inputFields (the inputs that activity requests).
 *
 * To add a new activity:
 * 1. Create lib/activities/<name>_activity.ts and define the activity (including inputFields).
 * 2. Import it below and add it to ACTIVITIES_CONFIG.
 * 3. If you use a new icon, add it to iconMap.tsx.
 */

import type { ActivityDefinition } from "./types";
import { validateInputActivity } from "./validate_input_activity";
import { processActivity } from "./process_activity";
import { logErrorActivity } from "./log_error_activity";
import { greetActivity } from "./greet_activity";
import { sendEmailActivity } from "./send_email_activity";
import { addToListActivity } from "./add_to_list_activity";

export const ACTIVITIES_CONFIG: ActivityDefinition[] = [
  validateInputActivity,
  processActivity,
  logErrorActivity,
  greetActivity,
  sendEmailActivity,
  addToListActivity,
];
