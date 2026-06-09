"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, query, Timestamp, where } from "firebase/firestore";
import { PenTool, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

interface ClientContract {
  id: string;
  contractTitle: string;
  type: string;
  status: string;
  updatedAt: Date | null;
}

interface ContractsWidgetProps {
  workspaceId: string;
  userId: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  signed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ContractsWidget({ workspaceId, userId }: ContractsWidgetProps) {
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    (async () => {
      try {
        // Demo mode: serve from in-memory store
        if (isDemoMode()) {
          const { demoStore } = await import("@/lib/demo/demo-data");
          const contracts = demoStore
            .getContracts()
            .filter(
              (c: { status?: string }) => c.status !== "draft"
            )
            .slice(0, 4);
          setContracts(
            contracts.map(
              (c: {
                id: string;
                contractTitle?: string;
                type?: string;
                status?: string;
                updatedAt?: Timestamp;
              }) => ({
                id: c.id,
                contractTitle: c.contractTitle || "Untitled",
                type: c.type || "contract",
                status: c.status || "draft",
                updatedAt: c.updatedAt?.toDate() ?? null,
              })
            )
          );
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "contracts"),
          where("workspaceId", "==", workspaceId),
          limit(20)
        );
        const snap = await getDocs(q);
        const results = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              contractTitle: data.contractTitle || "Untitled",
              type: data.type || "contract",
              status: data.status || "draft",
              updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? null,
            } as ClientContract;
          })
          .filter((c) => c.status !== "draft")
          .slice(0, 4);
        setContracts(results);
      } catch {
        setContracts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PenTool className="h-4 w-4 text-primary" />
            Contracts
          </CardTitle>
          <CardDescription>Your contracts & proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <PenTool className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No contracts yet</p>
            <p className="text-xs text-muted-foreground/60">
              Contracts shared with you will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PenTool className="h-4 w-4 text-primary" />
            Contracts
          </CardTitle>
          <Link
            href="/client/contracts"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription>
          {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contracts.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`/client/contracts/${c.id}`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.contractTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {c.type}
                  {c.updatedAt && (
                    <>
                      {" · "}Updated{" "}
                      {c.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`ml-2 shrink-0 text-[10px] px-1.5 py-0 ${
                  STATUS_STYLES[c.status] || ""
                }`}
              >
                {c.status}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
