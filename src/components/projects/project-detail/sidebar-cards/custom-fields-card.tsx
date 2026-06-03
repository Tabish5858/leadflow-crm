"use client";

import { ListChecks } from "lucide-react";
import type { Project } from "@/types";

interface CustomFieldsCardProps {
  project: Project;
}

export default function CustomFieldsCard({ project }: CustomFieldsCardProps) {
  const fields = project.customFields;
  if (!fields || Object.keys(fields).length === 0) {
    return (
      <div
        style={{ borderRadius: "8px" }}
        className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
      >
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Custom Fields</h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-3">No custom fields</p>
      </div>
    );
  }

  return (
    <div
      style={{ borderRadius: "8px" }}
      className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Custom Fields</h3>
      </div>
      <div className="space-y-2">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
            <p className="text-sm font-medium text-foreground">
              {typeof value === "boolean" ? (value ? "Yes" : "No") :
               Array.isArray(value) ? value.join(", ") :
               String(value ?? "—")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
