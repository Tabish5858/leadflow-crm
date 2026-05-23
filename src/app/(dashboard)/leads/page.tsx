"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { TooltipButton } from "@/components/ui/tooltip-button";
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
import { SortableColumnHeader } from "@/components/leads/sortable-column-header";
import { SelectFieldCell } from "@/components/leads/select-field-cell";
import { ColumnReorderItem } from "@/components/leads/column-reorder-item";
import { useColumnResize } from "@/lib/hooks/use-column-resize";
import { ScoreBadge } from "@/components/leads/score-badge";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/lib/toast";
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
  // ─── Column visibility and ordering ──────────────────────────────────
  const COLUMN_LABELS: Record<string, string> = {
    name: "Name",
    company: "Company",
    status: "Status",
    value: "Value",
    created: "Created",
    score: "Score",
  };

  const STANDARD_TOGGLEABLE = Object.keys(COLUMN_LABELS);

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("leadflow_col_visibility");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("leadflow_col_order");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("leadflow_col_visibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem("leadflow_col_order", JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Build the effective column order: standard fields + custom fields (new ones appended at end)
  const allCustomFields = activeWorkspace?.customFields || [];
  const allCustomPrefixed = allCustomFields.map((cf) => `cf_${cf.id}`);
  const defaultOrder = ["name", "company", "status", "value", ...allCustomPrefixed, "created", "score"];

  const effectiveOrder = useMemo(() => {
    let order = columnOrder.length > 0 ? [...columnOrder] : [...defaultOrder];
    // Remove stale IDs (deleted custom fields)
    const valid = new Set([...STANDARD_TOGGLEABLE, ...allCustomPrefixed]);
    order = order.filter((id) => valid.has(id));
    // Append new custom fields not yet in order
    for (const prefixed of allCustomPrefixed) {
      if (!order.includes(prefixed)) order.push(prefixed);
    }
    return order;
  }, [columnOrder, allCustomPrefixed, defaultOrder]);

  const isColumnVisible = (id: string) => columnVisibility[id] !== false;

  const visibleToggleable = effectiveOrder.filter(isColumnVisible);

  // Full render columns (checkbox + toggleable + actions)
  const renderColumnIds = useMemo(() => {
    return ["checkbox", ...visibleToggleable, "actions"];
  }, [visibleToggleable]);

  // ─── DnD column reorder from dropdown ─────────────────────────────────
  const [dropdownDragId, setDropdownDragId] = useState<string | null>(null);
  const dropdownSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDropdownDragStart = (event: DragStartEvent) => {
    setDropdownDragId(String(event.active.id));
  };

  const handleDropdownDragEnd = (event: DragEndEvent) => {
    setDropdownDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = effectiveOrder.indexOf(String(active.id));
    const newIdx = effectiveOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...effectiveOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, String(active.id));
    setColumnOrder(next);
  };

  const moveColumn = (id: string, direction: "up" | "down") => {
    const idx = effectiveOrder.indexOf(id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === effectiveOrder.length - 1) return;
    const next = [...effectiveOrder];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setColumnOrder(next);
  };

  const { columnWidths, startResize } = useColumnResize("leads");

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
          <div className="overflow-x-auto min-w-[900px]">
            <table className="min-w-full w-max table-fixed">
                  <thead>
                    <tr className="border-b">
                      {renderColumnIds.map((colId) => {
                        if (colId === "checkbox") {
                          return (
                            <th key="checkbox" className="sticky left-0 z-10 bg-card w-12 px-4 py-3">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={allSelected ? clearSelection : selectAll}
                              />
                            </th>
                          );
                        }
                        if (colId === "actions") {
                          const allToggleableColumns = [
                            ...STANDARD_TOGGLEABLE.map((id) => ({ id, label: COLUMN_LABELS[id] })),
                            ...allCustomFields.map((cf) => ({
                              id: `cf_${cf.id}`,
                              label: cf.name,
                              isCustom: true as const,
                            })),
                          ];
                          return (
                            <th key="actions" className="sticky right-0 z-20 bg-card w-12 px-4 py-3">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <TooltipButton
                                    tooltip="Toggle &amp; reorder columns"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </TooltipButton>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72 p-1 max-h-80 overflow-y-auto" sideOffset={4}>
                                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground sticky top-0 bg-popover z-10 border-b mb-1">
                                    Toggle &amp; reorder columns
                                  </p>
                                  <DndContext
                                    sensors={dropdownSensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDropdownDragStart}
                                    onDragEnd={handleDropdownDragEnd}
                                  >
                                    <SortableContext
                                      items={effectiveOrder}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {allToggleableColumns.map((col) => {
                                        const colIdx = effectiveOrder.indexOf(col.id);
                                        return (
                                          <ColumnReorderItem
                                            key={col.id}
                                            id={col.id}
                                            label={col.label}
                                            isCustom={"isCustom" in col}
                                            isVisible={isColumnVisible(col.id)}
                                            isLast={colIdx === effectiveOrder.length - 1}
                                            onToggleVisibility={() =>
                                              setColumnVisibility((prev) => ({
                                                ...prev,
                                                [col.id]: prev[col.id] === false ? true : false,
                                              }))
                                            }
                                            onMoveDown={() => moveColumn(col.id, "down")}
                                          />
                                        );
                                      })}
                                    </SortableContext>
                                  </DndContext>
                                  {allToggleableColumns.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setColumnVisibility({})}
                                      className="w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md mt-1 border-t pt-2"
                                    >
                                      Reset to default
                                    </button>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </th>
                          );
                        }
                        // Standard or custom field column
                        const isCustom = colId.startsWith("cf_");
                        const cf = isCustom
                          ? allCustomFields.find((c) => `cf_${c.id}` === colId)
                          : undefined;
                        const label = isCustom
                          ? cf?.name || colId
                          : COLUMN_LABELS[colId] || colId;
                        const minWidth = isCustom ? 120 : STANDARD_TOGGLEABLE.includes(colId)
                          ? ({ name: 180, company: 140, status: 120, value: 100, created: 120, score: 90 } as Record<string, number>)[colId] || 72
                          : 72;
                        const responsiveClass = isCustom
                          ? "hidden lg:table-cell"
                          : ({ name: "", company: "hidden md:table-cell", status: "hidden lg:table-cell", value: "hidden lg:table-cell", created: "hidden xl:table-cell", score: "" } as Record<string, string>)[colId] || "";

                        return (
                          <SortableColumnHeader
                            key={colId}
                            colId={colId}
                            width={columnWidths[colId]}
                            onResizeStart={startResize}
                            minWidth={minWidth}
                            className={cn(
                              "text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                              responsiveClass
                            )}
                          >
                            {label}
                          </SortableColumnHeader>
                        );
                      })}
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
                        {renderColumnIds.map((colId) => {
                          if (colId === "checkbox") {
                            return (
                              <td key="checkbox" className="sticky left-0 z-10 bg-card px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.has(lead.id)}
                                  onCheckedChange={() => toggleSelect(lead.id)}
                                />
                              </td>
                            );
                          }
                          if (colId === "actions") {
                            return (
                              <td key="actions" className="sticky right-0 z-20 bg-card px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <TooltipButton
                                      tooltip="Actions"
                                      variant="ghost"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </TooltipButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedLead(lead.id)}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {stages
                                      .filter((s) => s.id !== lead.status)
                                      .map((stage) => (
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
                            );
                          }
                          if (colId === "name") {
                            return (
                              <td key="name" className="px-4 py-3">
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
                            );
                          }
                          if (colId === "company") {
                            return (
                              <td key="company" className="px-4 py-3 text-sm hidden md:table-cell">
                                {lead.company || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          }
                          if (colId === "status") {
                            return (
                              <td key="status" className="px-4 py-3 hidden lg:table-cell">
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
                            );
                          }
                          if (colId === "value") {
                            return (
                              <td key="value" className="px-4 py-3 text-sm font-medium hidden lg:table-cell">
                                {lead.value
                                  ? formatCurrency(lead.value, lead.currency)
                                  : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                              </td>
                            );
                          }
                          if (colId === "created") {
                            return (
                              <td key="created" className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                                {formatDate(lead.createdAt?.toDate())}
                              </td>
                            );
                          }
                          if (colId === "score") {
                            return (
                              <td key="score" className="px-4 py-3">
                                {leadScores[lead.id] && (
                                  <ScoreBadge
                                    score={leadScores[lead.id].score}
                                    breakdown={leadScores[lead.id].breakdown}
                                    size="sm"
                                  />
                                )}
                              </td>
                            );
                          }
                          // Custom field
                          if (colId.startsWith("cf_")) {
                            const cf = allCustomFields.find((c) => `cf_${c.id}` === colId);
                            if (!cf) return null;
                            const rawValue = lead.customFields?.[cf.id];
                            const isSelectType = cf.type === "select" || cf.type === "multiselect";
                            return (
                              <td key={colId} className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                                {isSelectType ? (
                                  <SelectFieldCell
                                    customField={cf}
                                    value={rawValue}
                                    leadId={lead.id}
                                  />
                                ) : rawValue != null ? (
                                  <span>{String(rawValue)}</span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            );
                          }
                          return null;
                        })}
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
        customFields={activeWorkspace?.customFields || []}
      />
    </div>
  );
}
