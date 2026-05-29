"use client";

import { ColumnReorderItem } from "@/components/leads/column-reorder-item";
import { InlineEditCell } from "@/components/leads/inline-edit-cell";
import { LeadFilters } from "@/components/leads/lead-filters";
import { ScoreBadge } from "@/components/leads/score-badge";
import { SelectFieldCell } from "@/components/leads/select-field-cell";
import { SortableColumnHeader } from "@/components/leads/sortable-column-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { SkeletonTable } from "@/components/skeletons/skeleton-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useHeaderActions } from "@/contexts/header-actions-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { getEmailsForWorkspace, type EmailRecord } from "@/lib/firebase/emails";
import { useColumnResize } from "@/lib/hooks/use-column-resize";
import {
  applyFilters,
  filtersToUrlParams,
  getActiveFilterCount,
  urlParamsToFilters,
  type FilterState,
} from "@/lib/lead-filters";
import { calculateLeadScore, type ScoreBreakdown } from "@/lib/lead-scoring";
import { useLeadStore } from "@/lib/stores/leadStore";
import { toast } from "@/lib/toast";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { PipelineStage } from "@/types";
import {
  closestCenter,
  DndContext,
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
  ArrowUpDown,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const { setHeaderActions } = useHeaderActions();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [deleteConfirmLeadId, setDeleteConfirmLeadId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<string>("sr");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  // ─── Column visibility and ordering ──────────────────────────────────
  const COLUMN_LABELS: Record<string, string> = {
    sr: "#",
    name: "Name",
    company: "Company",
    website: "Website",
    country: "Country",
    status: "Status",
    value: "Value",
    created: "Created",
    score: "Score",
    expectedClose: "Expected Close",
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
  // Exclude "SR." custom field from default columns (we use the standard `sr` field instead)
  const allCustomPrefixed = allCustomFields
    .filter((cf) => cf.name !== "SR.")
    .map((cf) => `cf_${cf.id}`);
  const defaultOrder = ["sr", "name", "company", "website", "country", "status", "value", "expectedClose", ...allCustomPrefixed, "created", "score"];

  const effectiveOrder = useMemo(() => {
    // If saved order is missing any standard column, reset to default
    const hasAllStandard = STANDARD_TOGGLEABLE.every((id) => columnOrder.includes(id));
    let order = columnOrder.length > 0 && hasAllStandard ? [...columnOrder] : [...defaultOrder];
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

  // Lookup map for toggleable columns (standard + custom fields)
  const allToggleableMap = useMemo(() => {
    const map = new Map<string, { label: string; isCustom: boolean }>();
    for (const id of STANDARD_TOGGLEABLE) {
      map.set(id, { label: COLUMN_LABELS[id], isCustom: false });
    }
    for (const cf of allCustomFields) {
      map.set(`cf_${cf.id}`, { label: cf.name, isCustom: true });
    }
    return map;
  }, [allCustomFields]);

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
    loadingMore,
    hasMore,
    totalCount,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    removeLeads,
    editLead,
    initialize,
    loadMore,
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
    } else if (sortBy === "sr") {
      sorted.sort((a, b) => (a.sr ?? 999) - (b.sr ?? 999));
    }
    return sorted;
  }, [finalFilteredLeads, sortBy, leadScores]);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      await removeLeads(Array.from(selectedIds), user?.id, user?.displayName);
      clearSelection();
      toast.success(`${count} lead${count > 1 ? "s" : ""} deleted`);
    } catch {
      toast.error("Failed to delete leads");
    }
  };

  const handleStatusChange = (leadId: string, status: string) => {
    useLeadStore.getState().updateStatus(leadId, status, user?.id, user?.displayName);
    toast.success("Status updated");
  };

  const handleDeleteFromActions = async (leadId: string) => {
    try {
      await useLeadStore.getState().removeLead(leadId, user?.id, user?.displayName);
      toast.success("Lead deleted");
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setDeleteConfirmLeadId(null);
    }
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
      const newId = await createLead({
        ...data,
        workspaceId: activeWorkspace.id,
        createdBy: user.id,
      });
      // Audit log for each imported lead (fire-and-forget)
      if (user.displayName) {
        const leadName = `${data.firstName} ${data.lastName}`.trim();
        import("@/lib/firebase/activities").then(({ logLeadCreated }) => {
          logLeadCreated(newId, activeWorkspace.id, user.id, user.displayName, leadName);
        }).catch(() => {});
      }
    }
    initialize(activeWorkspace.id);
    refreshStats(activeWorkspace.id);
  };

  const allSelected =
    sortedLeads.length > 0 &&
    sortedLeads.every((l) => selectedIds.has(l.id));

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <ExportButton type="leads" data={sortedLeads} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCsvImport(true)}
          className="hidden sm:flex"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    ),
    [sortedLeads]
  );

  useEffect(() => {
    setHeaderActions(headerActions);
    return () => setHeaderActions(null);
  }, [headerActions, setHeaderActions]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const state = useLeadStore.getState();
        if (state.hasMore && !state.loading && !state.loadingMore && activeWorkspace?.id) {
          state.loadMore(activeWorkspace.id);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeWorkspace?.id, leads.length]);

  return (
    <RequireModuleAccess moduleId="leads">
      <div className="space-y-6">
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
              Showing {finalFilteredLeads.length} of {totalCount} leads
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort: {sortBy === "sr" ? "SR" : sortBy === "score" ? "Score" : "Created"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("sr")}>
                  Sort by #
                </DropdownMenuItem>
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
        <div className="rounded-xl border bg-card h-full">
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
          ) : null}
        </div>

        {/* Table + Load More */}
        {sortedLeads.length > 0 && (
          <div className="overflow-x-auto overflow-y-auto min-w-[900px] max-h-[calc(100vh-320px)]">
              <table className="min-w-full w-max table-fixed">
              <thead className="sticky top-0 z-10 bg-card">
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
                                  {effectiveOrder.map((id) => {
                                    const col = allToggleableMap.get(id);
                                    if (!col) return null;
                                    const colIdx = effectiveOrder.indexOf(id);
                                    return (
                                      <ColumnReorderItem
                                        key={id}
                                        id={id}
                                        label={col.label}
                                        isCustom={col.isCustom}
                                        isVisible={isColumnVisible(id)}
                                        isLast={colIdx === effectiveOrder.length - 1}
                                        onToggleVisibility={() =>
                                          setColumnVisibility((prev) => ({
                                            ...prev,
                                            [id]: prev[id] === false ? true : false,
                                          }))
                                        }
                                        onMoveDown={() => moveColumn(id, "down")}
                                      />
                                    );
                                  })}
                                </SortableContext>
                              </DndContext>
                              {allToggleableMap.size > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnVisibility({});
                                    setColumnOrder(defaultOrder);
                                  }}
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
                      ? ({ name: 180, company: 140, website: 140, status: 120, value: 100, expectedClose: 120, created: 120, score: 90 } as Record<string, number>)[colId] || 72
                      : 72;
                    const responsiveClass = isCustom
                      ? "hidden lg:table-cell"
                      : ({ name: "", company: "hidden md:table-cell", website: "hidden md:table-cell", status: "hidden lg:table-cell", value: "hidden lg:table-cell", expectedClose: "hidden xl:table-cell", created: "hidden xl:table-cell", score: "" } as Record<string, string>)[colId] || "";

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
                      "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                      selectedIds.has(lead.id) && "bg-muted/50"
                    )}
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
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmLeadId(lead.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
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
                                <div className="font-medium text-sm">
                                  <InlineEditCell
                                    type="name"
                                    firstName={lead.firstName}
                                    lastName={lead.lastName}
                                    onSave={async (val) => {
                                      const { firstName, lastName } = val as { firstName: string; lastName: string };
                                      editLead(lead.id, { firstName, lastName }, user?.id, user?.displayName);
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  <InlineEditCell
                                    type="email"
                                    value={lead.email}
                                    onSave={async (val) => {
                                      const emailVal = val as string | null;
                                      editLead(lead.id, { email: emailVal || "" }, user?.id, user?.displayName);
                                    }}
                                  />
                                </p>
                              </div>
                            </div>
                          </td>
                        );
                      }
                      if (colId === "sr") {
                        return (
                          <td key="sr" className="px-4 py-3 text-sm text-muted-foreground tabular-nums w-12">
                            {lead.sr ?? "—"}
                          </td>
                        );
                      }
                      if (colId === "company") {
                        return (
                          <td key="company" className="px-4 py-3 text-sm hidden md:table-cell">
                            <InlineEditCell
                              type="text"
                              value={lead.company}
                              placeholder="—"
                              onSave={async (val) => {
                                const v = val as string | null;
                                editLead(lead.id, { company: v || undefined }, user?.id, user?.displayName);
                              }}
                            />
                          </td>
                        );
                      }
                      if (colId === "website") {
                        return (
                          <td key="website" className="px-4 py-3 text-sm hidden md:table-cell">
                            <InlineEditCell
                              type="url"
                              value={lead.website}
                              placeholder="—"
                              onSave={async (val) => {
                                const v = val as string | null;
                                editLead(lead.id, { website: v || undefined }, user?.id, user?.displayName);
                              }}
                            />
                          </td>
                        );
                      }
                      if (colId === "country") {
                        return (
                          <td key="country" className="px-4 py-3 text-sm hidden lg:table-cell">
                            <CountrySelect
                              value={lead.country || ""}
                              onChange={async (v) => {
                                editLead(lead.id, { country: v || undefined }, user?.id, user?.displayName);
                              }}
                              placeholder="—"
                              inline
                            />
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
                            <InlineEditCell
                              type="number"
                              value={lead.value}
                              displayValue={lead.value ? formatCurrency(lead.value, lead.currency) : undefined}
                              placeholder="—"
                              onSave={async (val) => {
                                const v = val as number | null;
                                editLead(lead.id, { value: v ?? undefined }, user?.id, user?.displayName);
                              }}
                            />
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
                      if (colId === "expectedClose") {
                        return (
                          <td key="expectedClose" className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                            {lead.expectedCloseAt
                              ? formatDate(lead.expectedCloseAt.toDate())
                              : "—"}
                          </td>
                        );
                      }
                      // Custom field
                      if (colId.startsWith("cf_")) {
                        const cf = allCustomFields.find((c) => `cf_${c.id}` === colId);
                        if (!cf) return null;
                        const rawValue = lead.customFields?.[cf.id];
                        const isSelectType = cf.type === "select" || cf.type === "multiselect";

                        const saveCustomField = async (newVal: unknown) => {
                          const store = useLeadStore.getState();
                          const current = store.leads.find((l) => l.id === lead.id);
                          const merged = { ...(current?.customFields || {}), [cf.id]: newVal };
                          // Optimistic update local state
                          useLeadStore.setState((s) => ({
                            leads: s.leads.map((l) => l.id === lead.id ? { ...l, customFields: merged } : l),
                            filteredLeads: s.filteredLeads.map((l) => l.id === lead.id ? { ...l, customFields: merged } : l),
                          }));
                          // Firestore sync in background
                          const { updateLead } = await import("@/lib/firebase/firestore");
                          await updateLead(lead.id, { customFields: merged }).catch(() => {
                            initialize(activeWorkspace?.id || "");
                          });
                          // Audit log (fire-and-forget)
                          if (current && user?.id && user?.displayName) {
                            const leadName = `${current.firstName} ${current.lastName}`.trim();
                            const oldCF = { ...(current.customFields || {}) };
                            import("@/lib/firebase/activities").then(({ logLeadUpdated }) => {
                              logLeadUpdated(
                                lead.id, current.workspaceId, user.id, user.displayName,
                                leadName, { customFields: oldCF } as Record<string, unknown>,
                                { customFields: merged } as Record<string, unknown>
                              );
                            }).catch(() => {});
                          }
                        };

                        const inlineType = cf.type === "number" ? "number" :
                          cf.type === "date" ? "date" :
                            cf.type === "email" ? "email" :
                              cf.type === "url" ? "url" :
                                cf.type === "checkbox" ? "checkbox" :
                                  "text";

                        return (
                          <td key={colId} className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                            {isSelectType ? (
                              <SelectFieldCell
                                customField={cf}
                                value={rawValue}
                                leadId={lead.id}
                                userId={user?.id}
                                userName={user?.displayName}
                              />
                            ) : inlineType === "checkbox" ? (
                              <InlineEditCell
                                type="checkbox"
                                checked={!!rawValue}
                                onSave={saveCustomField}
                              />
                            ) : inlineType === "date" ? (
                              <InlineEditCell
                                type="date"
                                value={rawValue ? String(rawValue) : null}
                                displayValue={rawValue ? String(rawValue) : undefined}
                                placeholder="—"
                                onSave={saveCustomField}
                              />
                            ) : (
                              <InlineEditCell
                                type={inlineType as "text" | "number" | "email" | "url"}
                                value={rawValue != null ? String(rawValue) : null}
                                placeholder="—"
                                onSave={saveCustomField}
                              />
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

            {!hasMore && !loading && leads.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-3">Showing all {leads.length} leads</p>
            )}
            {loadingMore && (
              <p className="text-center text-xs text-muted-foreground py-3">Loading more leads...</p>
            )}
            <div ref={sentinelRef} className={hasMore ? "h-4" : "hidden"} />
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm
              onSuccess={handleCreateSuccess}
              userId={user?.id || ""}
              userName={user?.displayName || ""}
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
            <DialogTitle className="sr-only">Lead Details</DialogTitle>
            {selectedLead && <LeadDetail leadId={selectedLead} />}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmLeadId} onOpenChange={(open) => !open && setDeleteConfirmLeadId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete lead</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteConfirmLeadId && handleDeleteFromActions(deleteConfirmLeadId)}
              >
                Delete
              </Button>
            </DialogFooter>
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
    </RequireModuleAccess>
  );
}
