"use client";

import dynamic from "next/dynamic";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { useEffect, useState } from "react";

const LeadDetail = dynamic(() => import("@/components/leads/lead-detail").then((mod) => mod.LeadDetail), {
  loading: () => <div className="p-8 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>,
});

export default function PipelinePage() {
  const { activeWorkspace } = useWorkspace();
  const { loading, initializeAll, refreshStats } = useLeadStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Load all leads in a single query (pipeline needs the full dataset)
  useEffect(() => {
    if (!activeWorkspace) return;
    initializeAll(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  }, [activeWorkspace?.id, initializeAll, refreshStats]);

  if (loading) {
    return (
      <div className="space-y-6">
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
    <RequireModuleAccess moduleId="pipeline">
      <div className="space-y-6">
        <KanbanBoard onLeadClick={(leadId) => setSelectedLeadId(leadId)} />
      </div>

      <Dialog
        open={!!selectedLeadId}
        onOpenChange={(open) => !open && setSelectedLeadId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Lead Details</DialogTitle>
          {selectedLeadId && <LeadDetail leadId={selectedLeadId} />}
        </DialogContent>
      </Dialog>
    </RequireModuleAccess>
  );
}
