"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PipelinePage() {
  const { activeWorkspace } = useWorkspace();
  const { loading, initialize, refreshStats } = useLeadStore();

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, refreshStats, activeWorkspace]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-8 w-32 skeleton rounded-md" />
          <div className="h-4 w-64 skeleton rounded-md" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-3">
              <div className="rounded-lg bg-card p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-12 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Drag and drop leads between stages to update their status."
      />
      <KanbanBoard />
    </div>
  );
}
