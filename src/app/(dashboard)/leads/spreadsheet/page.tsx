"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { SpreadsheetList } from "@/components/leads/spreadsheet-list";
import { getSpreadsheets, type Spreadsheet } from "@/lib/firebase/spreadsheets";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function SpreadsheetPage() {
  const { user, activeWorkspace } = useWorkspace();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const data = await getSpreadsheets(activeWorkspace.id);
      setSpreadsheets(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeWorkspace?.id]);

  if (!activeWorkspace || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <SpreadsheetList
      spreadsheets={spreadsheets}
      workspaceId={activeWorkspace.id}
      userId={user.id}
      onRefresh={load}
    />
  );
}
