"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, query, Timestamp, where } from "firebase/firestore";
import { Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  dueDate: Date | null;
}

interface InvoicesWidgetProps {
  workspaceId: string;
  userId: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending_review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function InvoicesWidget({ workspaceId, userId }: InvoicesWidgetProps) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    (async () => {
      try {
        // Demo mode: serve from in-memory store
        if (isDemoMode()) {
          const { demoStore } = await import("@/lib/demo/demo-data");
          const invoices = demoStore
            .getInvoices()
            .filter(
              (inv: { clientId?: string }) => inv.clientId === userId
            )
            .slice(0, 4);
          setInvoices(
            invoices.map(
              (inv: {
                id: string;
                invoiceNumber?: string;
                status?: string;
                total?: number;
                currency?: string;
                dueDate?: Timestamp;
              }) => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber || "N/A",
                status: inv.status || "draft",
                total: inv.total || 0,
                currency: inv.currency || "USD",
                dueDate: inv.dueDate?.toDate() ?? null,
              })
            )
          );
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "invoices"),
          where("workspaceId", "==", workspaceId),
          where("clientId", "==", userId),
          limit(10)
        );
        const snap = await getDocs(q);
        const results = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            invoiceNumber: data.invoiceNumber || "N/A",
            status: data.status || "draft",
            total: data.total || 0,
            currency: data.currency || "USD",
            dueDate: (data.dueDate as Timestamp)?.toDate() ?? null,
          } as ClientInvoice;
        });
        setInvoices(results.slice(0, 4));
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
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

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" />
            Invoices
          </CardTitle>
          <CardDescription>Your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/60">
              Invoices will appear here once created.
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
            <Receipt className="h-4 w-4 text-primary" />
            Invoices
          </CardTitle>
          <Link
            href="/client/invoices"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription>
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.slice(0, 4).map((inv) => (
            <Link
              key={inv.id}
              href={`/client/invoices/${inv.id}`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inv.dueDate
                    ? `Due ${inv.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "No due date"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatCurrency(inv.total, inv.currency)}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-0.5 text-[10px] px-1.5 py-0 ${
                    STATUS_STYLES[inv.status] || ""
                  }`}
                >
                  {inv.status.replace("_", " ")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
