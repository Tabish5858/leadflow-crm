"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadDetail } from "@/components/leads/lead-detail";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonTable } from "@/components/skeletons/skeleton-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  Search,
  Plus,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Users,
} from "lucide-react";
import { cn, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";

type LeadStatusType =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

const statusLabelMap: Record<string, LeadStatusType> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export default function LeadsPage() {
  const { user, activeWorkspace } = useWorkspace();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    leads,
    filteredLeads,
    loading,
    searchQuery,
    selectedIds,
    setSearchQuery,
    toggleSelect,
    selectAll,
    clearSelection,
    removeLeads,
    initialize,
    refreshStats,
  } = useLeadStore();

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, refreshStats, activeWorkspace]);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      await removeLeads(Array.from(selectedIds));
      clearSelection();
      toast.success(`${count} lead${count > 1 ? "s" : ""} deleted`);
    } catch {
      toast.error("Failed to delete leads");
    }
  };

  const handleStatusChange = (leadId: string, status: string) => {
    useLeadStore.getState().updateStatus(leadId, status);
    toast.success("Status updated");
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    toast.success("Lead created successfully");
  };

  const filteredByStatus =
    statusFilter === "all"
      ? filteredLeads
      : filteredLeads.filter((l) => l.status === statusFilter);

  const allSelected =
    filteredByStatus.length > 0 &&
    filteredByStatus.every((l) => selectedIds.has(l.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${leads.length} total lead${leads.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {DEFAULT_PIPELINE_STAGES.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <SkeletonTable columns={5} rows={8} />
        ) : filteredByStatus.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={
                searchQuery || statusFilter !== "all"
                  ? "No leads found"
                  : "No leads yet"
              }
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start building your pipeline by adding your first lead."
              }
              actionLabel={
                !searchQuery && statusFilter === "all"
                  ? "Add Your First Lead"
                  : undefined
              }
              onAction={
                !searchQuery && statusFilter === "all"
                  ? () => setShowCreateDialog(true)
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={allSelected ? clearSelection : selectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Value
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                    Created
                  </th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredByStatus.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer",
                      selectedIds.has(lead.id) && "bg-muted/50"
                    )}
                    onClick={() => setSelectedLead(lead.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {getInitials(`${lead.firstName} ${lead.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {lead.company || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <StatusBadge
                        status={statusLabelMap[lead.status] ?? "New"}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium hidden lg:table-cell">
                      {lead.value
                        ? formatCurrency(lead.value, lead.currency)
                        : (
                            <span className="text-muted-foreground">—</span>
                          )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                      {formatDate(lead.createdAt?.toDate())}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedLead(lead.id)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {DEFAULT_PIPELINE_STAGES.filter(
                            (s) => s.id !== lead.status
                          ).map((stage) => (
                            <DropdownMenuItem
                              key={stage.id}
                              onClick={() =>
                                handleStatusChange(lead.id, stage.id)
                              }
                            >
                              Move to {stage.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSuccess={handleCreateSuccess}
            userId={user?.id || ""}
            workspaceId={activeWorkspace?.id || ""}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLead && <LeadDetail leadId={selectedLead} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
