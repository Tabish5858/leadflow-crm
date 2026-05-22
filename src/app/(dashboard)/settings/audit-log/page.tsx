"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { getAuditLogs, formatAuditAction, getActionBadgeVariant } from "@/lib/audit-log";
import type { AuditLog, AuditAction, AuditFilters } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Activity,
  FileText,
} from "lucide-react";
import { Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toast } from "@/lib/toast";

const PAGE_SIZE = 20;

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_updated", label: "Lead Updated" },
  { value: "lead_deleted", label: "Lead Deleted" },
  { value: "status_changed", label: "Status Changed" },
  { value: "email_sent", label: "Email Sent" },
  { value: "document_uploaded", label: "Document Uploaded" },
  { value: "document_deleted", label: "Document Deleted" },
  { value: "task_created", label: "Task Created" },
  { value: "task_completed", label: "Task Completed" },
  { value: "user_login", label: "User Login" },
  { value: "user_logout", label: "User Logout" },
  { value: "settings_changed", label: "Settings Changed" },
  { value: "note_added", label: "Note Added" },
  { value: "call_logged", label: "Call Logged" },
  { value: "meeting_logged", label: "Meeting Logged" },
  { value: "member_added", label: "Member Added" },
  { value: "member_removed", label: "Member Removed" },
  { value: "member_role_changed", label: "Role Changed" },
  { value: "pipeline_changed", label: "Pipeline Changed" },
  { value: "custom_field_changed", label: "Custom Field Changed" },
  { value: "workspace_created", label: "Workspace Created" },
  { value: "workspace_deleted", label: "Workspace Deleted" },
];

function formatTimestamp(ts: Timestamp): string {
  const date = ts.toDate();
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimestampShort(ts: Timestamp): string {
  const date = ts.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AuditLogPage() {
  const { activeWorkspace } = useWorkspace();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageStack, setPageStack] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const uniqueUsers = useCallback(() => {
    const userMap = new Map<string, string>();
    for (const log of logs) {
      if (!userMap.has(log.userId)) {
        userMap.set(log.userId, log.userName);
      }
    }
    return Array.from(userMap.entries());
  }, [logs]);

  const fetchLogs = useCallback(async (reset = true) => {
    if (!activeWorkspace) return;
    setLoading(true);

    const auditFilters: AuditFilters = {};
    if (dateFrom) auditFilters.dateFrom = new Date(dateFrom);
    if (dateTo) auditFilters.dateTo = new Date(dateTo);
    if (userFilter) auditFilters.userId = userFilter;
    if (actionFilter) auditFilters.action = actionFilter as AuditAction;
    if (leadSearch) auditFilters.leadSearch = leadSearch;

    try {
      const lastDoc = reset ? undefined : (pageStack[page - 2] ?? undefined);
      const result = await getAuditLogs(
        activeWorkspace.id,
        auditFilters,
        pageSize,
        lastDoc
      );

      setLogs(result.logs);
      setLastVisible(result.lastVisible);
      setTotalItems(result.total);

      if (reset) {
        setPage(1);
        setPageStack([]);
      }
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, dateFrom, dateTo, userFilter, actionFilter, leadSearch, pageSize, pageStack, page]);

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage > page && lastVisible) {
      setPageStack((prev) => [...prev, lastVisible]);
    } else if (newPage < page) {
      setPageStack((prev) => prev.slice(0, -1));
    }
    setPage(newPage);
    fetchLogs(false);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setPageStack([]);
  };

  const handleApplyFilters = () => {
    fetchLogs(true);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setUserFilter("");
    setActionFilter("");
    setLeadSearch("");
    fetchLogs(true);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Timestamp", "User", "Action", "Entity Type", "Entity Name", "Details"];
    const rows = logs.map((log) => [
      formatTimestamp(log.timestamp),
      log.userName,
      formatAuditAction(log.action),
      log.entityType,
      log.entityName || "N/A",
      buildDetails(log),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${activeWorkspace?.name}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" description="View all activity across your workspace." />
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all activity and changes across your workspace."
        actions={
          <Button variant="outline" onClick={handleExportCSV} disabled={logs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filter Panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide" : "Show"}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    User
                  </label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All users</SelectItem>
                      {uniqueUsers().map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    Action Type
                  </label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by lead name..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleApplyFilters} size="sm">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={handleClearFilters} size="sm">
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No audit logs found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {showFilters
                  ? "Try adjusting your filters or date range."
                  : "Activity will appear here as users interact with the workspace."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[140px]">User</TableHead>
                  <TableHead className="w-[160px]">Action</TableHead>
                  <TableHead className="w-[100px]">Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {formatTimestampShort(log.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{log.userName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {formatAuditAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm capitalize text-muted-foreground">
                        {log.entityType}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{buildDetails(log)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && logs.length > 0 && (
            <div className="border-t p-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={totalItems}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildDetails(log: AuditLog): string {
  if (log.entityName) {
    switch (log.action) {
      case "status_changed": {
        const oldStatus = log.oldValue?.status as string | undefined;
        const newStatus = log.newValue?.status as string | undefined;
        if (oldStatus && newStatus) {
          return `${log.entityName}: "${oldStatus}" → "${newStatus}"`;
        }
        return log.entityName;
      }
      case "lead_updated": {
        const changedFields = log.newValue
          ? Object.keys(log.newValue).filter(
              (k) => log.oldValue?.[k] !== log.newValue?.[k]
            )
          : [];
        if (changedFields.length > 0) {
          return `${log.entityName}: ${changedFields.slice(0, 3).join(", ")} updated`;
        }
        return log.entityName;
      }
      case "email_sent": {
        const subject = (log.metadata?.subject as string) || "Email";
        return `${log.entityName}: ${subject}`;
      }
      case "task_created":
      case "task_completed": {
        const title = (log.metadata?.title as string) || "Task";
        return `${log.entityName}: ${title}`;
      }
      default:
        return log.entityName;
    }
  }
  return log.action.replace(/_/g, " ");
}
