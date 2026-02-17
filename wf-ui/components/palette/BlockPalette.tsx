"use client";

import { ACTIVITIES } from "@/lib/activities";
import { getActivityIcon } from "@/lib/activities/iconMap";
import { GitBranch, Radio, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const DRAG_TYPE = "application/x-workflow-block";

export type PaletteDragPayload =
  | { stepType: "activity"; activityName: string }
  | { stepType: "condition" }
  | { stepType: "signal" };

function matchSearch(activity: { name: string; label: string; description?: string }, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase().trim();
  return (
    activity.name.toLowerCase().includes(lower) ||
    activity.label.toLowerCase().includes(lower) ||
    (activity.description?.toLowerCase().includes(lower) ?? false)
  );
}

export function BlockPalette() {
  const [activitySearch, setActivitySearch] = useState("");

  const filteredActivities = useMemo(
    () => ACTIVITIES.filter((a) => matchSearch(a, activitySearch)),
    [activitySearch]
  );

  const onDragStart = useCallback((e: React.DragEvent, payload: PaletteDragPayload) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground px-1">Activities</h2>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search activities..."
          value={activitySearch}
          onChange={(e) => setActivitySearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-background pl-7 pr-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        {filteredActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">No activities match your search.</p>
        ) : (
          filteredActivities.map((activity) => {
            const IconComponent = getActivityIcon(activity.icon);
            return (
              <div
                key={activity.name}
                draggable
                onDragStart={(e) => onDragStart(e, { stepType: "activity", activityName: activity.name })}
                className="flex flex-col gap-0.5 rounded-md border bg-background px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {IconComponent ? (
                    <IconComponent className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : null}
                  <span className="text-sm font-medium">{activity.label}</span>
                </div>
                {activity.description ? (
                  <p className="text-xs text-muted-foreground pl-6 line-clamp-2">{activity.description}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground px-1 mt-2">Steps</h2>
      <div className="flex flex-col gap-1">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, { stepType: "condition" })}
          className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">Condition</span>
        </div>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, { stepType: "signal" })}
          className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
        >
          <Radio className="h-4 w-4" />
          <span className="text-sm font-medium">Signal</span>
        </div>
      </div>
    </div>
  );
}

export { DRAG_TYPE };
