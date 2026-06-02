"use client";

import { ExportButton } from "@/components/shared/export-button";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonCardGrid } from "@/components/skeletons/skeleton-card";
import { SkeletonChartGrid } from "@/components/skeletons/skeleton-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useHeaderActions } from "@/contexts/header-actions-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { AVAILABLE_METRICS, getAnalyticsCards } from "@/lib/analytics-cards";
import { DEFAULT_PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/constants";
import type { AnalyticsMetrics } from "@/lib/export";
import { db } from "@/lib/firebase/client";
import { useLeadStore } from "@/lib/stores/leadStore";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsCardConfig, AnalyticsCardType, PipelineStage } from "@/types";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Filter,
  Layers,
  LineChartIcon,
  ListOrdered,
  Pencil,
  PieChartIcon,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

const COLORS = [
  "hsl(212 72% 58%)",
  "hsl(270 60% 62%)",
  "hsl(24 94% 58%)",
  "hsl(152 55% 42%)",
  "hsl(0 63% 45%)",
  "hsl(38 92% 50%)",
  "hsl(215 16% 60%)",
  "hsl(190 70% 45%)",
];

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 365 },
];

const CHART_COLORS = {
  line: "hsl(24 94% 58%)",
  bar: "hsl(152 55% 42%)",
};

// ─── Metric → KPI config ────────────────────────────────────────────────────

interface KpiDef {
  value: (ctx: MetricCtx) => string | number;
  icon: React.ReactNode;
  accent: "info" | "primary" | "success" | "warning" | "default";
}

interface MetricCtx {
  totalLeads: number;
  activeDeals: number;
  wonLeads: number;
  lostLeads: number;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
  avgDealSize: number;
}

const KPI_DEFS: Record<string, KpiDef> = {
  total_leads: {
    value: (c) => c.totalLeads,
    icon: <Users className="h-5 w-5" />,
    accent: "info",
  },
  active_deals: {
    value: (c) => c.activeDeals,
    icon: <Target className="h-5 w-5" />,
    accent: "primary",
  },
  pipeline_value: {
    value: (c) => formatCurrency(c.totalValue),
    icon: <DollarSign className="h-5 w-5" />,
    accent: "success",
  },
  win_rate: {
    value: (c) => `${c.conversionRate}%`,
    icon: <TrendingUp className="h-5 w-5" />,
    accent: "warning",
  },
  won_leads: {
    value: (c) => `${c.wonLeads}`,
    icon: <Target className="h-5 w-5" />,
    accent: "success",
  },
  lost_leads: {
    value: (c) => `${c.lostLeads}`,
    icon: <TrendingDown className="h-5 w-5" />,
    accent: "warning",
  },
  avg_deal_size: {
    value: (c) => formatCurrency(c.avgDealSize),
    icon: <DollarSign className="h-5 w-5" />,
    accent: "primary",
  },
  won_value: {
    value: (c) => formatCurrency(c.wonValue),
    icon: <DollarSign className="h-5 w-5" />,
    accent: "success",
  },
  conversion_rate: {
    value: (c) => `${c.conversionRate}%`,
    icon: <TrendingUp className="h-5 w-5" />,
    accent: "primary",
  },
};

// ─── Card type → icon ───────────────────────────────────────────────────────

const CARD_TYPE_ICONS: Record<AnalyticsCardType, React.ReactNode> = {
  kpi: <BarChart3 className="h-4 w-4" />,
  line_chart: <LineChartIcon className="h-4 w-4" />,
  pie_chart: <PieChartIcon className="h-4 w-4" />,
  bar_chart: <BarChart3 className="h-4 w-4" />,
  funnel: <Filter className="h-4 w-4" />,
  top_leads: <ListOrdered className="h-4 w-4" />,
  summary: <Layers className="h-4 w-4" />,
};

const CARD_TYPE_LABELS: Record<AnalyticsCardType, string> = {
  kpi: "KPI Card",
  line_chart: "Line Chart",
  pie_chart: "Pie Chart",
  bar_chart: "Bar Chart",
  funnel: "Funnel",
  top_leads: "Top Leads",
  summary: "Summary",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { activeWorkspace, user } = useWorkspace();
  const { setHeaderActions } = useHeaderActions();
  const { leads, loading, initialize } = useLeadStore();
  const [dateRange, setDateRange] = useState(30);
  const [editMode, setEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const stages: PipelineStage[] = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;
  const isAdmin =
    user?.role === "owner" ||
    user?.role === "admin" ||
    activeWorkspace?.ownerId === user?.id;

  // Cards from workspace config
  const activeCards = useMemo(
    () => getAnalyticsCards(activeWorkspace?.analyticsCards),
    [activeWorkspace?.analyticsCards]
  );

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, activeWorkspace]);

  // ─── Date filter ───────────────────────────────────────────────────────

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dateRange);
  const filteredLeads = useMemo(
    () => leads.filter((l) => !l.createdAt || l.createdAt.toDate() >= cutoff),
    [leads, cutoff]
  );

  // ─── Derived data ──────────────────────────────────────────────────────

  const leadsOverTimeData = useMemo(() => {
    const leadsOverTime: Record<string, number> = {};
    for (const lead of filteredLeads) {
      const date = lead.createdAt?.toDate().toLocaleDateString() || "Unknown";
      leadsOverTime[date] = (leadsOverTime[date] || 0) + 1;
    }
    return Object.entries(leadsOverTime)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({ date, leads: count }));
  }, [filteredLeads]);

  const valueOverTimeData = useMemo(() => {
    const valueOverTime: Record<string, number> = {};
    for (const lead of filteredLeads) {
      const date = lead.createdAt?.toDate().toLocaleDateString() || "Unknown";
      valueOverTime[date] = (valueOverTime[date] || 0) + (lead.value || 0);
    }
    return Object.entries(valueOverTime)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, value]) => ({ date, value }));
  }, [filteredLeads]);

  const pipelineData = useMemo(() =>
    stages.map((stage) => ({
      name: stage.name,
      value: filteredLeads.filter((l) => l.status === stage.id).length,
      color: stage.color,
    })).filter((d) => d.value > 0),
    [filteredLeads, stages]
  );

  const revenueData = useMemo(() =>
    stages.map((stage) => ({
      name: stage.name,
      value: filteredLeads
        .filter((l) => l.status === stage.id)
        .reduce((sum, l) => sum + (l.value || 0), 0),
    })).filter((d) => d.value > 0),
    [filteredLeads, stages]
  );

  const sourceData = useMemo(() =>
    LEAD_SOURCES.map((source) => ({
      name: source.replace(/_/g, " "),
      value: filteredLeads.filter((l) => l.source === source).length,
    })).filter((d) => d.value > 0),
    [filteredLeads]
  );

  // KPIs
  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter((l) => l.status === "won").length;
  const lostLeads = filteredLeads.filter((l) => l.status === "lost").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  const activeDeals = filteredLeads.filter((l) => !["won", "lost"].includes(l.status)).length;
  const wonValue = filteredLeads.filter((l) => l.status === "won").reduce((sum, l) => sum + (l.value || 0), 0);
  const avgDealSize = wonLeads > 0 ? wonValue / wonLeads : 0;

  const metricCtx: MetricCtx = {
    totalLeads,
    activeDeals,
    wonLeads,
    lostLeads,
    totalValue,
    wonValue,
    conversionRate,
    avgDealSize,
  };

  const analyticsMetrics = useMemo<AnalyticsMetrics>(
    () => ({
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      totalValue,
      activeDeals,
      wonValue,
      avgDealSize,
      dateRange: DATE_RANGES.find((r) => r.days === dateRange)?.label || "Last 30 days",
      generatedAt: new Date().toLocaleDateString(),
    }),
    [
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      totalValue,
      activeDeals,
      wonValue,
      avgDealSize,
      dateRange,
    ]
  );

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {editMode ? "Done" : "Edit Cards"}
          </Button>
        )}
        <ExportButton type="analytics" data={analyticsMetrics} />
        <Select
          value={dateRange.toString()}
          onValueChange={(v) => setDateRange(parseInt(v))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((range) => (
              <SelectItem key={range.days} value={range.days.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    [isAdmin, editMode, analyticsMetrics, dateRange]
  );

  useEffect(() => {
    if (loading) {
      setHeaderActions(null);
      return;
    }
    setHeaderActions(headerActions);
    return () => setHeaderActions(null);
  }, [loading, headerActions, setHeaderActions]);

  // Top leads
  const topLeads = useMemo(() =>
    [...filteredLeads]
      .filter((l) => l.value && l.value > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 5),
    [filteredLeads]
  );

  // Industry breakdown
  const nicheChartData = useMemo(() => {
    const nicheData = filteredLeads.reduce<Record<string, number>>((acc, lead) => {
      const niche = lead.niche || "Unknown";
      acc[niche] = (acc[niche] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(nicheData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredLeads]);

  // Funnel
  const funnelData = useMemo(() =>
    stages.map((stage) => ({
      name: stage.name,
      count: filteredLeads.filter((l) => l.status === stage.id).length,
      value: filteredLeads.filter((l) => l.status === stage.id).reduce((sum, l) => sum + (l.value || 0), 0),
    })),
    [filteredLeads, stages]
  );

  // Custom field data (for custom field charts)
  const getCustomFieldData = useCallback((fieldId: string) => {
    const field = activeWorkspace?.customFields?.find((f) => f.id === fieldId);
    if (!field) return [];
    const counts: Record<string, number> = {};
    for (const lead of filteredLeads) {
      const val = lead.customFields?.[fieldId];
      if (val === undefined || val === null || val === "") continue;
      const key = String(val);
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads, activeWorkspace]);

  // ─── Save cards to workspace ──────────────────────────────────────────

  const saveCards = useCallback(
    async (cards: AnalyticsCardConfig[]) => {
      if (!activeWorkspace) return;
      try {
        // Firestore rejects undefined values - strip them
        const sanitized = cards.map((card) =>
          Object.fromEntries(
            Object.entries(card).filter(([, v]) => v !== undefined)
          )
        );
        await updateDoc(doc(db, "workspaces", activeWorkspace.id), {
          analyticsCards: sanitized,
        });
      } catch (err) {
        console.error("Failed to save analytics cards:", err);
        toast.error("Failed to save layout");
      }
    },
    [activeWorkspace]
  );

  const handleReorder = useCallback(
    (cardId: string, direction: "up" | "down") => {
      const cards = getAnalyticsCards(activeWorkspace?.analyticsCards);
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= cards.length) return;
      // Swap
      [cards[idx], cards[targetIdx]] = [cards[targetIdx], cards[idx]];
      // Re-assign orders
      const updated = cards.map((c, i) => ({ ...c, order: i }));
      saveCards(updated);
    },
    [activeWorkspace, saveCards]
  );

  const handleRemove = useCallback(
    (cardId: string) => {
      const cards = getAnalyticsCards(activeWorkspace?.analyticsCards);
      const filtered = cards.filter((c) => c.id !== cardId);
      const updated = filtered.map((c, i) => ({ ...c, order: i }));
      saveCards(updated);
      toast.success("Card removed");
    },
    [activeWorkspace, saveCards]
  );

  const handleAddCard = useCallback(
    (metric: string, customFieldId?: string) => {
      const cards = getAnalyticsCards(activeWorkspace?.analyticsCards);

      // Custom field chart metrics not in AVAILABLE_METRICS - handle directly
      if (metric === "__custom_field_bar__" || metric === "__custom_field_pie__") {
        const cfName = customFieldId
          ? activeWorkspace?.customFields?.find((f) => f.id === customFieldId)?.name
          : undefined;
        const newCard: AnalyticsCardConfig = {
          id: `card-${Date.now()}`,
          type: metric === "__custom_field_bar__" ? "bar_chart" : "pie_chart",
          title: cfName || "Custom Field",
          metric,
          customFieldId: customFieldId || undefined,
          order: cards.length,
        };
        saveCards([...cards, newCard]);
        setAddDialogOpen(false);
        toast.success("Card added");
        return;
      }

      const option = AVAILABLE_METRICS.find((m) => m.value === metric);
      if (!option) return;
      const newCard: AnalyticsCardConfig = {
        id: `card-${Date.now()}`,
        type: option.cardType,
        title: customFieldId
          ? activeWorkspace?.customFields?.find((f) => f.id === customFieldId)?.name || "Custom Field"
          : option.label,
        metric,
        customFieldId: customFieldId || undefined,
        order: cards.length,
      };
      saveCards([...cards, newCard]);
      setAddDialogOpen(false);
      toast.success("Card added");
    },
    [activeWorkspace, saveCards]
  );

  // ─── Reset to default ─────────────────────────────────────────────────

  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetToDefault = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      await updateDoc(doc(db, "workspaces", activeWorkspace.id), {
        analyticsCards: deleteField(),
      });
      toast.success("Layout reset to default");
      setConfirmReset(false);
    } catch (err) {
      console.error("Failed to reset analytics cards:", err);
      toast.error("Failed to reset layout");
    }
  }, [activeWorkspace]);

  // ─── Render a single card ─────────────────────────────────────────────

  const renderCardContent = useCallback(
    (card: AnalyticsCardConfig) => {
      // --- KPI ---
      if (card.type === "kpi") {
        const def = KPI_DEFS[card.metric];
        if (!def) return <div className="p-4 text-sm text-muted-foreground">Unknown KPI: {card.metric}</div>;
        return (
          <StatCard
            title={card.title}
            value={def.value(metricCtx)}
            icon={def.icon}
            accentColor={def.accent}
          />
        );
      }

      // --- Line Chart ---
      if (card.type === "line_chart") {
        const chartData = card.metric === "value_over_time" ? valueOverTimeData : leadsOverTimeData;
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-white" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-elevated)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={card.metric === "value_over_time" ? "value" : "leads"}
                      stroke={CHART_COLORS.line}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: CHART_COLORS.line }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      // --- Pie Chart ---
      if (card.type === "pie_chart") {
        let pieData: { name: string; value: number; color?: string }[] = [];
        if (card.metric === "pipeline_distribution") pieData = pipelineData;
        else if (card.metric === "lead_sources") pieData = sourceData;
        else if (card.customFieldId) pieData = getCustomFieldData(card.customFieldId);

        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      fill="hsl(var(--foreground))"
                      fontSize={11}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-elevated)",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      // --- Bar Chart ---
      if (card.type === "bar_chart") {
        let barData: { name: string; value: number }[] = [];
        if (card.metric === "revenue_by_stage") barData = revenueData;
        else if (card.metric === "industry_breakdown") barData = nicheChartData;
        else if (card.customFieldId) barData = getCustomFieldData(card.customFieldId);

        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={card.metric === "revenue_by_stage" ? (value: number) => formatCurrency(value) : undefined}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-elevated)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="value" fill={CHART_COLORS.bar} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      // --- Funnel ---
      if (card.type === "funnel") {
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="space-y-3">
                  {funnelData.map((stage, index) => {
                    const maxCount = Math.max(...funnelData.map((s) => s.count), 1);
                    const width = (stage.count / maxCount) * 100;
                    return (
                      <div key={stage.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stage.name}</span>
                          <span className="text-muted-foreground">
                            {stage.count} leads • {formatCurrency(stage.value)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No data for this period
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      // --- Top Leads ---
      if (card.type === "top_leads") {
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              {topLeads.length > 0 ? (
                <div className="space-y-3">
                  {topLeads.map((lead, index) => (
                    <div key={lead.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                          <p className="text-xs text-muted-foreground">{lead.company || "No company"}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(lead.value || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No leads with value data
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      // --- Summary ---
      if (card.type === "summary") {
        return (
          <Card>
            <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Leads</span>
                  <span className="text-lg font-bold">{totalLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Won Deals</span>
                  <span className="text-lg font-bold text-green-600">{wonLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lost Deals</span>
                  <span className="text-lg font-bold text-red-600">{lostLeads}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <span className="text-lg font-bold">{conversionRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Won Revenue</span>
                  <span className="text-lg font-bold">{formatCurrency(wonValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Deal Size</span>
                  <span className="text-lg font-bold">{formatCurrency(avgDealSize)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      return null;
    },
    [
      metricCtx, leadsOverTimeData, valueOverTimeData, pipelineData, revenueData,
      sourceData, topLeads, nicheChartData, funnelData, getCustomFieldData,
      totalLeads, wonLeads, lostLeads, conversionRate, wonValue, avgDealSize,
      totalValue, activeDeals
    ]
  );

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCardGrid count={4} />
        <SkeletonChartGrid />
      </div>
    );
  }

  return (
    <RequireModuleAccess moduleId="analytics">
      <div className="space-y-6">
        {/* ─── Card grid ────────────────────────────────────────────────── */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeCards.map((card) => {
            const isKpi = card.type === "kpi";
            if (!isKpi) return null;
            return (
              <div key={card.id} className="relative group/card">
                {editMode && (
                  <div className="absolute -top-2 -right-2 z-10 flex gap-0.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleReorder(card.id, "up")}
                      disabled={card.order === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleReorder(card.id, "down")}
                      disabled={card.order === activeCards.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleRemove(card.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {renderCardContent(card)}
              </div>
            );
          })}
        </div>

        {/* Non-KPI cards (2-col grid) */}
        <div className="grid gap-4 md:grid-cols-2">
          {activeCards.map((card) => {
            if (card.type === "kpi") return null;
            return (
              <div key={card.id} className="relative group/card">
                {editMode && (
                  <div className="absolute -top-2 -right-2 z-10 flex gap-0.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleReorder(card.id, "up")}
                      disabled={card.order === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleReorder(card.id, "down")}
                      disabled={card.order === activeCards.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow"
                      onClick={() => handleRemove(card.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {renderCardContent(card)}
              </div>
            );
          })}
        </div>

        {/* ─── Edit mode actions ─────────────────────────────────────── */}

        {editMode && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-dashed py-8"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
            <Button
              variant="destructive"
              className="py-8"
              onClick={() => setConfirmReset(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        )}

        {/* ─── Reset confirmation dialog ──────────────────────────────── */}

        <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset analytics layout?</DialogTitle>
              <DialogDescription>
                This will remove all custom cards and restore the default 12-card layout.
                Any cards you added will be lost. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleResetToDefault}>
                Reset to Default
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Add Card Dialog ──────────────────────────────────────────── */}

        <AddCardDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          customFields={activeWorkspace?.customFields || []}
          existingCards={activeCards}
          onAdd={handleAddCard}
        />
      </div>
    </RequireModuleAccess>
  );
}

// ─── Add Card Dialog ─────────────────────────────────────────────────────────

function AddCardDialog({
  open,
  onOpenChange,
  customFields,
  existingCards,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customFields: { id: string; name: string; type: string }[];
  existingCards: AnalyticsCardConfig[];
  onAdd: (metric: string, customFieldId?: string) => void;
}) {
  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedCustomField, setSelectedCustomField] = useState("");
  const [filterType, setFilterType] = useState<AnalyticsCardType | "all">("all");

  const selectableFields = customFields.filter(
    (f) => f.type === "select" || f.type === "multiselect"
  );

  // Build metric list: built-in + dynamic custom field entries
  const filteredMetrics = useMemo(() => {
    const builtIn = AVAILABLE_METRICS.filter((m) => {
      if (filterType !== "all" && m.cardType !== filterType) return false;
      if (existingCards.find((c) => c.metric === m.value)) return false;
      return true;
    });

    // Add dynamic custom field entries for bar/pie chart types
    const withCustom: typeof builtIn = [...builtIn];
    if (
      selectableFields.length > 0 &&
      (filterType === "all" || filterType === "bar_chart" || filterType === "pie_chart")
    ) {
      if (filterType === "all" || filterType === "bar_chart") {
        withCustom.push({
          value: "__custom_field_bar__",
          label: "Custom Field (Bar Chart)",
          cardType: "bar_chart",
          description: "Show distribution of a select/multiselect custom field values as bars",
          isBuiltIn: false,
        });
      }
      if (filterType === "all" || filterType === "pie_chart") {
        withCustom.push({
          value: "__custom_field_pie__",
          label: "Custom Field (Pie Chart)",
          cardType: "pie_chart",
          description: "Show distribution of a select/multiselect custom field values as pie",
          isBuiltIn: false,
        });
      }
    }
    return withCustom;
  }, [filterType, existingCards, selectableFields]);

  const isCustomFieldMetric =
    selectedMetric === "__custom_field_bar__" || selectedMetric === "__custom_field_pie__";
  const option = isCustomFieldMetric
    ? AVAILABLE_METRICS.find((m) => m.cardType === (selectedMetric === "__custom_field_bar__" ? "bar_chart" : "pie_chart"))
    : AVAILABLE_METRICS.find((m) => m.value === selectedMetric);
  const needsCustomField = isCustomFieldMetric;
  const canAdd = selectedMetric && (!needsCustomField || selectedCustomField);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Analytics Card</DialogTitle>
          <DialogDescription>
            Select a card type and metric to add to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={filterType === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => { setFilterType("all"); setSelectedMetric(""); }}
            >
              All
            </Badge>
            {(Object.keys(CARD_TYPE_LABELS) as AnalyticsCardType[]).map((type) => (
              <Badge
                key={type}
                variant={filterType === type ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setFilterType(type); setSelectedMetric(""); }}
              >
                {CARD_TYPE_ICONS[type]}
                <span className="ml-1">{CARD_TYPE_LABELS[type]}</span>
              </Badge>
            ))}
          </div>

          {/* Metric select */}
          <Select value={selectedMetric} onValueChange={(v) => { setSelectedMetric(v); setSelectedCustomField(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a metric..." />
            </SelectTrigger>
            <SelectContent>
              {filteredMetrics.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{CARD_TYPE_ICONS[m.cardType]}</span>
                    {m.label}
                    {m.isBuiltIn && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">built-in</Badge>}
                  </span>
                </SelectItem>
              ))}
              {filteredMetrics.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No metrics available. Try another filter.
                </div>
              )}
            </SelectContent>
          </Select>

          {/* Custom field picker (for pie/bar charts) */}
          {(isCustomFieldMetric ||
            option?.cardType === "bar_chart" ||
            option?.cardType === "pie_chart") && selectableFields.length > 0 && (
              <Select value={selectedCustomField} onValueChange={setSelectedCustomField}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a custom field..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          {(isCustomFieldMetric ||
            option?.cardType === "bar_chart" ||
            option?.cardType === "pie_chart") && selectableFields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No select/multiselect custom fields available. Create one in Settings → Custom Fields.
              </p>
            )}

          {/* Add button */}
          <Button
            className="w-full"
            disabled={!canAdd}
            onClick={() => onAdd(selectedMetric, selectedCustomField || undefined)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
