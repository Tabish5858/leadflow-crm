"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { fetchClientInvoices } from "@/lib/client/client-data";
import type { InvoiceSummary } from "@/lib/client/client-data";
import { cn } from "@/lib/utils";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ErrorState,
  PageHeader,
  SkeletonList,
} from "@/components/client/module-layout";

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  sent: "Unpaid",
  overdue: "Overdue",
  draft: "Draft",
  cancelled: "Cancelled",
  partial: "Partial",
  pending_review: "Pending Review",
};

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
    currency: currency || "USD",
  }).format(amount);
}

function ClientInvoicesPage() {
  const { clientWorkspaceId, uid } = useClientUser();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!clientWorkspaceId || !uid) return;
    setLoading(true);
    fetchClientInvoices(clientWorkspaceId, uid, 100)
      .then(setInvoices)
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [clientWorkspaceId, uid]);

  const filtered = useMemo(() => {
    // Never show drafts to clients
    let visible = invoices.filter((inv) => inv.status !== "draft");
    if (statusFilter !== "all") visible = visible.filter((inv) => inv.status === statusFilter);
    // Paid invoices at the bottom
    return [...visible].sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return 0;
    });
  }, [invoices, statusFilter]);

  // Exclude drafts from summary
  const visibleInvoices = useMemo(() => invoices.filter((inv) => inv.status !== "draft"), [invoices]);

  const totalOutstanding = useMemo(
    () =>
      visibleInvoices
        .filter((inv) => inv.status === "sent" || inv.status === "overdue" || inv.status === "partial")
        .reduce((sum, inv) => sum + inv.total, 0),
    [visibleInvoices]
  );

  if (error) {
    return (
      <div>
        <PageHeader title="Invoices" />
        <ErrorState
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={
          loading
            ? "Loading..."
            : `${visibleInvoices.length} invoice${visibleInvoices.length !== 1 ? "s" : ""}`
        }
      />

      {/* Summary cards */}
      {!loading && visibleInvoices.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
              <p className="text-2xl font-bold">{visibleInvoices.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  visibleInvoices
                    .filter((inv) => inv.status === "paid")
                    .reduce((sum, inv) => sum + inv.total, 0),
                  "USD"
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOutstanding, "USD")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      {!loading && visibleInvoices.length > 0 && (
        <div className="mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="sent">Unpaid</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonList count={4} height="h-24" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">
              {statusFilter !== "all"
                ? "No invoices match this filter"
                : "No invoices yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== "all"
                ? "Try a different filter."
                : "Invoices will appear here once issued."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <Link
              key={inv.id}
              href={`/client/invoices/${inv.id}`}
              className="block"
            >
              <Card className="transition-all hover:border-primary/50 hover:shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-sm">
                        {inv.invoiceNumber}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          STATUS_STYLES[inv.status] || ""
                        )}
                      >
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Issued{" "}
                      {inv.issueDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · Due{" "}
                      {inv.dueDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-bold">
                      {formatCurrency(inv.total, inv.currency)}
                    </p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientInvoicesPageWrapper() {
  return (
    <ModuleGuard moduleKey="invoices">
      <ClientInvoicesPage />
    </ModuleGuard>
  );
}
