"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { getContracts, deleteContract, getTemplates, deleteTemplate } from "@/lib/firebase/contracts";
import type { Contract, ContractTemplate, ContractStatus, ContractType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import {
  FileText,
  Loader2,
  Plus,
  Search,
  FileSignature,
  FileCheck,
  FileX,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type TabType = "Contracts" | "Templates";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  signed: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  terminated: "bg-orange-100 text-orange-700 border-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  terminated: "Terminated",
};

function getStatusBadge(status: string) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";
  const label = STATUS_LABELS[status] || status;
  return (
    <Badge variant="outline" className={`${style} border text-xs font-medium`}>
      {label}
    </Badge>
  );
}

function getTypeIcon(type: string) {
  if (type === "proposal") return <FileCheck className="h-4 w-4 text-purple-500" />;
  return <FileSignature className="h-4 w-4 text-blue-500" />;
}

function formatDate(ts: { toDate?: () => Date; seconds?: number } | null | undefined) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams?.get("tab") as TabType) || "Contracts"
  );
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"contract" | "template">("contract");
  const [clientMap, setClientMap] = useState<Map<string, { name: string; email: string }>>(new Map());

  // Build a lookup map of client IDs → { name, email }
  const loadClients = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const wsSnap = await getDocs(
        query(collection(db, "workspaces"), where("__name__", "==", activeWorkspace.id))
      );
      const memberIds: string[] = wsSnap.docs[0]?.data()?.memberIds || [];
      const map = new Map<string, { name: string; email: string }>();
      for (const uid of memberIds) {
        const userSnap = await getDocs(
          query(collection(db, "users"), where("__name__", "==", uid))
        );
        const userData = userSnap.docs[0]?.data();
        if (userData) {
          map.set(uid, {
            name: userData.displayName || userData.email || uid,
            email: userData.email || "",
          });
        }
      }
      setClientMap(map);
    } catch {
      // Silently fail — client names just won't show
    }
  }, [activeWorkspace?.id]);

  const loadContracts = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getContracts(activeWorkspace.id, { max: 200 });
      setContracts(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error("Failed to load contracts: " + msg);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  // Load clients once on mount
  useEffect(() => { loadClients(); }, [loadClients]);

  const loadTemplates = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplates(activeWorkspace.id);
      setTemplates(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error("Failed to load templates: " + msg);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (activeTab === "Contracts") loadContracts();
    else loadTemplates();
  }, [activeTab, loadContracts, loadTemplates]);

  const filteredContracts = useMemo(() => {
    let list = contracts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contractTitle.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [contracts, search, statusFilter]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.templateTitle.toLowerCase().includes(q));
  }, [templates, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      if (deleteType === "contract") {
        await deleteContract(deleteId);
        setContracts((prev) => prev.filter((c) => c.id !== deleteId));
        toast.success("Contract deleted");
      } else {
        await deleteTemplate(deleteId);
        setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
        toast.success("Template deleted");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/contracts?tab=${tab}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, send, and manage contracts and proposals
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/contracts/new">
            <Plus className="h-4 w-4" />
            {activeTab === "Templates" ? "New Template" : "New Contract"}
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {(["Contracts", "Templates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      {!loading && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={activeTab === "Contracts" ? "Search contracts..." : "Search templates..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {activeTab === "Contracts" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Signed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-destructive mb-4">
              <FileText className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-semibold">Failed to load</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">{error}</p>
            <Button variant="outline" size="sm" onClick={() => activeTab === "Contracts" ? loadContracts() : loadTemplates()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !error && activeTab === "Contracts" ? (
        filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">
                {search || statusFilter !== "all" ? "No matching contracts" : "No contracts yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search || statusFilter !== "all"
                  ? "Try different search or filter terms."
                  : "Create your first contract or proposal to get started."}
              </p>
              {!search && statusFilter === "all" && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/contracts/new">
                    <Plus className="h-4 w-4" />
                    New Contract
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Title</div>
              <div>Type</div>
              <div>Status</div>
              <div>Client</div>
              <div>Sent</div>
              <div></div>
            </div>
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors items-center"
                onClick={() => router.push(`/contracts/${contract.id}`)}
              >
                <div className="text-sm font-medium truncate">
                  {contract.contractTitle}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {getTypeIcon(contract.type)}
                  <span className="capitalize">{contract.type}</span>
                </div>
                <div>{getStatusBadge(contract.status)}</div>
                <div className="flex items-center gap-2">
                  {contract.clientId && clientMap.has(contract.clientId) ? (
                    <>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {(clientMap.get(contract.clientId)?.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {clientMap.get(contract.clientId)?.name}
                      </span>
                    </>
                  ) : contract.clientId ? (
                    <>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        ?
                      </div>
                      <span className="text-xs text-muted-foreground">Unknown</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(contract.dateSent)}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteType("contract");
                      setDeleteId(contract.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !error && (
        // Templates tab
        filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">
                {search ? "No matching templates" : "No templates yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search
                  ? "Try a different search term."
                  : "Create a template from a contract or start fresh."}
              </p>
              {!search && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/contracts/new">
                    <Plus className="h-4 w-4" />
                    New Template
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Template Name</div>
              <div>Type</div>
              <div>Last Modified</div>
              <div></div>
            </div>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors items-center"
                onClick={() => router.push(`/contracts/templates/${template.id}`)}
              >
                <div className="text-sm font-medium truncate">
                  {template.templateTitle}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {getTypeIcon(template.type)}
                  <span className="capitalize">{template.type}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(template.updatedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteType("template");
                      setDeleteId(template.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteType === "contract" ? "Contract" : "Template"}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently remove this{" "}
              {deleteType} and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
