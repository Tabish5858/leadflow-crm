"use client";

import { getContracts } from "@/lib/firebase/contracts";
import type { Contract } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileText, Plus, FileSignature, FileCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Status styles (mirrors contracts list page) ────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  signed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  terminated: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  terminated: "Terminated",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ContractsCardProps {
  projectId: string;
  workspaceId: string;
  /** First client ID — used to pre-fill the new contract link */
  clientId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ContractsCard({ projectId, workspaceId, clientId }: ContractsCardProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    getContracts(workspaceId, { projectId, max: 50 })
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  // Build the new-contract link with pre-filled params
  const newContractParams = new URLSearchParams();
  if (projectId) newContractParams.set("projectId", projectId);
  if (clientId) newContractParams.set("clientId", clientId);
  const newContractHref = `/contracts/new?${newContractParams.toString()}`;

  return (
    <div
      style={{ borderRadius: "8px" }}
      className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Contracts</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={newContractHref}>
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-2">
            No contracts linked to this project
          </p>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={newContractHref}>
              <Plus className="h-3 w-3" />
              New Contract
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {contracts.map((c) => {
            const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {c.type === "proposal" ? (
                    <FileCheck className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                  ) : (
                    <FileSignature className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  )}
                  <span className="truncate text-xs font-medium">
                    {c.contractTitle}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", statusStyle)}
                >
                  {STATUS_LABELS[c.status] ||
                    c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </Badge>
              </Link>
            );
          })}
          <Button variant="outline" size="sm" className="w-full mt-1 gap-1" asChild>
            <Link href={newContractHref}>
              <Plus className="h-3 w-3" />
              New Contract
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
