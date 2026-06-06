"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Package, X } from "lucide-react";
import { getProjectDeliverables, markVersionAsRead } from "@/lib/firebase/project-deliverables";
import { useRouter } from "next/navigation";

interface UnreadVersion {
  deliverableId: string;
  deliverableTitle: string;
  versionId: string;
  versionNumber: number;
}

export function ClientDeliverableNotification({
  projectId,
  projectName,
  userId,
}: {
  projectId: string;
  projectName: string;
  userId: string;
}) {
  const [unread, setUnread] = useState<UnreadVersion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  const checkUnread = useCallback(async () => {
    try {
      const deliveries = await getProjectDeliverables(projectId);
      const found: UnreadVersion[] = [];
      for (const del of deliveries) {
        for (const v of del.versions) {
          if (!v.is_read && v.status === "submitted") {
            found.push({
              deliverableId: del.id,
              deliverableTitle: del.title,
              versionId: v.id,
              versionNumber: v.versionNumber,
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

  const handleDismiss = async (item: UnreadVersion) => {
    setDismissed((prev) => new Set(prev).add(item.versionId));
    await markVersionAsRead(item.deliverableId, item.versionId).catch(() => {});
  };

  const visible = unread.filter((u) => !dismissed.has(u.versionId));
  if (visible.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          New Deliverables
        </h4>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded-full">
          {visible.length} new
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((item) => (
          <div key={item.versionId} className="flex items-center justify-between bg-white dark:bg-blue-900/50 rounded px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{item.deliverableTitle}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">
                Version {item.versionNumber} · {projectName}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => router.push(`/client/projects/${projectId}`)}
                title="View"
              >
                <Eye className="h-3 w-3" />
              </Button>
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
          </div>
        ))}
      </div>
    </div>
  );
}
