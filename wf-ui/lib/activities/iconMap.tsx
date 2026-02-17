"use client";

import {
  CheckCircle,
  Loader,
  AlertCircle,
  Smile,
  Mail,
  ListPlus,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle,
  Loader,
  AlertCircle,
  Smile,
  Mail,
  ListPlus,
};

/**
 * Resolve an activity icon by name. Add new icons here when adding activities.
 * Use the Lucide icon name (PascalCase) in the activity definition.
 */
export function getActivityIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] ?? null;
}
