"use client";

import { History } from "lucide-react";
import type { Project } from "@/types";

interface ActivityLogCardProps {
  project: Project;
}

export default function ActivityLogCard({ project }: ActivityLogCardProps) {
  // For now, show basic project timestamps as activity log
  // TODO: Full activity log with new collection
  const activities: { action: string; timestamp: Date | null }[] = [
    { action: "Project created", timestamp: project.createdAt?.toDate() ?? null },
    { action: "Last updated", timestamp: project.updatedAt?.toDate() ?? null },
    ...(project.completedDate
      ? [{ action: "Project completed", timestamp: project.completedDate.toDate() }]
      : []),
  ];

  return (
    <div
      style={{ borderRadius: "8px" }}
      className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{activity.action}</p>
              <p className="text-[10px] text-muted-foreground">
                {activity.timestamp
                  ? activity.timestamp.toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })
                  : "Unknown"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
