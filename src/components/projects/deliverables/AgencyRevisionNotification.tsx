"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { getProjectDeliverables, markRevisionAsRead } from "@/lib/firebase/project-deliverables";

interface UnreadRevision {
  deliverableId: string;
  deliverableTitle: string;
  revisionId: string;
}

export function AgencyRevisionNotification({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [unread, setUnread] = useState<UnreadRevision[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const checkUnread = useCallback(async () => {
    try {
      const deliveries = await getProjectDeliverables(projectId);
      const found: UnreadRevision[] = [];
      for (const del of deliveries) {
        for (const r of del.revisions) {
          if (!r.is_read) {
            found.push({
              deliverableId: del.id,
              deliverableTitle: del.title,
              revisionId: r.id,
            });
          }
        }
      }
      setUnread(found);
    } catch {
      // Silently fail
    }
  }, [projectId]);

  useEffect(() => { checkUnread(); }, [checkUnread]);

  const handleDismiss = async (item: UnreadRevision) => {
    setDismissed((prev) => new Set(prev).add(item.revisionId));
    await markRevisionAsRead(item.deliverableId, item.revisionId).catch(() => {});
  };

  const visible = unread.filter((u) => !dismissed.has(u.revisionId));
  if (visible.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Revision Requests
        </h4>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded-full">
          {visible.length} pending
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((item) => (
          <div key={item.revisionId} className="flex items-center justify-between bg-white dark:bg-amber-900/50 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{item.deliverableTitle}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Revision requested · {projectName}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleDismiss(item)}
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
