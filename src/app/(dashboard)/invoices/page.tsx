"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { getInvoices, updateInvoice } from "@/lib/firebase/invoices";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type { Invoice, WorkspaceMember } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { activeWorkspace, user } = useWorkspace();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadInvoices = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, memberData] = await Promise.all([
        getInvoices(activeWorkspace.id),
        getWorkspaceMembers(activeWorkspace.id),
      ]);
      setInvoices(data);
      setMembers(memberData);
    } catch {
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const clientMap = useMemo(
    () => new Map(members.filter((m) => m.role === "client").map((m) => [m.userId, m])),
    [members]
  );

  const stats = useMemo(() => {
    const total = invoices.length;
    const totalOutstanding = invoices
      .filter((inv) => inv.status === "sent" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0);
    return { total, totalOutstanding, totalPaid };
  }, [invoices]);

  const filtered = useMemo(() => {
    let items = invoices;
    if (statusFilter !== "all") items = items.filter((inv) => inv.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.notes?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [invoices, statusFilter, searchQuery]);

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await updateInvoice(invoice.id, { status: "paid" });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, status: "paid" as const, paidDate: { toDate: () => new Date() } as Invoice["paidDate"] }
            : inv
        )
      );
      toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
    } catch {
      toast.error("Failed to update invoice");
    }
  };

  return (
    <RequireModuleAccess moduleId="invoices">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading..." : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>

        {/* Stats */}
        {!loading && invoices.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalOutstanding, "USD")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalPaid, "USD")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_STYLES).map(([key]) => (
                <SelectItem key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadInvoices}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">No invoices found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first invoice to get started."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button asChild className="mt-4">
                  <Link href="/invoices/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((invoice) => {
              const client = clientMap.get(invoice.clientId);
              const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
              const isOverdue = invoice.status === "sent" && invoice.dueDate?.toDate() < new Date();

              return (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <Card className="transition-colors hover:bg-muted/30 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {invoice.invoiceNumber}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] px-1.5 py-0", statusStyle)}
                              >
                                {isOverdue ? "Overdue" : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {client?.displayName || "Unknown client"}
                              {invoice.issueDate && (
                                <> &middot; {formatDate(invoice.issueDate.toDate())}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </p>
                          {invoice.status === "sent" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs mt-1"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMarkPaid(invoice);
                              }}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </RequireModuleAccess>
  );
}
