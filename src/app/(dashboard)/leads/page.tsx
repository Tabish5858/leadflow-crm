"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadFilters } from "@/components/leads/lead-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonTable } from "@/components/skeletons/skeleton-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBadge } from "@/components/leads/score-badge";
import {
  Search,
  Plus,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Users,
  Upload,
  ArrowUpDown,
} from "lucide-react";
import { cn, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import type { PipelineStage } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import {
  type FilterState,
  applyFilters,
  filtersToUrlParams,
  urlParamsToFilters,
  getActiveFilterCount,
} from "@/lib/lead-filters";
import { calculateLeadScore, type ScoreBreakdown } from "@/lib/lead-scoring";
import { getEmailsForWorkspace, type EmailRecord } from "@/lib/firebase/emails";
import { ExportButton } from "@/components/shared/export-button";

// Dynamically loaded components — only loaded when user opens the dialog
const LeadForm = dynamic(() => import("@/components/leads/lead-form").then((mod) => mod.LeadForm), {
  loading: () => <div className="p-8 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>,
});

const LeadDetail = dynamic(() => import("@/components/leads/lead-detail").then((mod) => mod.LeadDetail), {
  loading: () => <div className="p-8 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>,
});

const CsvImportDialog = dynamic(() => import("@/components/leads/csv-import-dialog").then((mod) => mod.CsvImportDialog), {
  loading: () => <div className="p-8 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>,
});

export default function LeadsPage() {
  const { user, activeWorkspace } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<string>("created");
  const [emails, setEmails] = useState<EmailRecord[]>([]);

  // Initialize filters from URL
  const [filters, setFilters] = useState<FilterState>(() => {
    return urlParamsToFilters(searchParams);
  });

  const {
    leads,
    filteredLeads,
    loading,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    removeLeads,
    initialize,
    refreshStats,
  } = useLeadStore();

  const stages: PipelineStage[] = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;

  // Extract unique sources and niches from leads
  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.source && set.add(l.source));
    return Array.from(set).sort();
  }, [leads]);

  const niches = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.niche && set.add(l.niche));
    return Array.from(set).sort();
  }, [leads]);

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, refreshStats, activeWorkspace]);

  // Load emails for scoring
  useEffect(() => {
    if (!activeWorkspace) return;
    getEmailsForWorkspace(activeWorkspace.id).then(setEmails);
  }, [activeWorkspace]);

  const syncFiltersToUrl = useCallback((newFilters: FilterState) => {
    const params = filtersToUrlParams(newFilters);
    const currentParams = searchParams.toString();
    const newParams = params.toString();
    if (currentParams !== newParams) {
      const url = newParams ? `?${newParams}` : window.location.pathname;
      router.replace(url, { scroll: false });
    }
  }, [router, searchParams]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    syncFiltersToUrl(newFilters);
  }, [syncFiltersToUrl]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        const newFilters = { ...filters, search: searchInput };
        setFilters(newFilters);
        syncFiltersToUrl(newFilters);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, syncFiltersToUrl]);

  // Sync search input when filters change from URL
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Apply filters to leads
  const finalFilteredLeads = useMemo(() => {
    return applyFilters(filteredLeads, filters);
  }, [filteredLeads, filters]);

  // Compute scores for all leads
  const leadScores = useMemo(() => {
    const scores: Record<string, { score: number; breakdown: ScoreBreakdown }> = {};
    const workspaceStages = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;
    finalFilteredLeads.forEach((lead) => {
      const leadEmails = emails.filter((e) => e.leadId === lead.id);
      const result = calculateLeadScore(lead, leadEmails, workspaceStages);
      scores[lead.id] = { score: result.total, breakdown: result };
    });
    return scores;
  }, [finalFilteredLeads, emails, activeWorkspace]);

  // Sort leads
  const sortedLeads = useMemo(() => {
    const sorted = [...finalFilteredLeads];
    if (sortBy === "score") {
      sorted.sort((a, b) => (leadScores[b.id]?.score ?? 0) - (leadScores[a.id]?.score ?? 0));
    }
    return sorted;
  }, [finalFilteredLeads, sortBy, leadScores]);

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

  const handleImportLeads = async (
    leadData: Omit<import("@/types").Lead, "id" | "createdAt" | "updatedAt">[]
  ) => {
    if (!activeWorkspace || !user) return;
    const { createLead } = await import("@/lib/firebase/firestore");
    for (const data of leadData) {
      await createLead({
        ...data,
        workspaceId: activeWorkspace.id,
        createdBy: user.id,
      });
    }
    initialize(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  };

  const allSelected =
    sortedLeads.length > 0 &&
    sortedLeads.every((l) => selectedIds.has(l.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${leads.length} total lead${leads.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            <ExportButton type="leads" data={sortedLeads} />
            <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)} className="hidden sm:flex">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, company, phone, notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <LeadFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            stages={stages}
            sources={sources}
            niches={niches}
            statusLabels={Object.fromEntries(stages.map((s) => [s.id, s.name]))}
          />
        </div>
      </div>

      {/* Results count and sort */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {finalFilteredLeads.length} of {filteredLeads.length} leads
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort: {sortBy === "score" ? "Score" : "Created"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("created")}>
                Sort by Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("score")}>
                Sort by Score
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Selection toolbar */}
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

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <SkeletonTable columns={5} rows={8} />
        ) : sortedLeads.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={
                filters.search || getActiveFilterCount(filters) > 0
                  ? "No leads found"
                  : "No leads yet"
              }
              description={
                filters.search || getActiveFilterCount(filters) > 0
                  ? "Try adjusting your search or filters"
                  : "Start building your pipeline by adding your first lead."
              }
              actionLabel={
                !filters.search && getActiveFilterCount(filters) === 0
                  ? "Add Your First Lead"
                  : undefined
              }
              onAction={
                !filters.search && getActiveFilterCount(filters) === 0
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
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Score
                  </th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead) => (
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
                      <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                        <SelectTrigger className="w-fit h-6 px-2 py-0 text-xs font-medium border-0 shadow-none hover:opacity-80 focus:ring-0 bg-muted/50 rounded-full">
                          {(() => {
                            const stage = stages.find((s) => s.id === lead.status);
                            return (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: stage?.color || "#94a3b8" }}
                                />
                                <p>{stage?.name || lead.status}</p>
                              </div>
                            );
                          })()}
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <td className="px-4 py-3">
                      {leadScores[lead.id] && (
                        <ScoreBadge
                          score={leadScores[lead.id].score}
                          breakdown={leadScores[lead.id].breakdown}
                          size="sm"
                        />
                      )}
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
                          {stages.filter(
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
            customFields={activeWorkspace?.customFields || []}
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

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        onImport={handleImportLeads}
        existingLeads={leads}
      />
    </div>
  );
}
