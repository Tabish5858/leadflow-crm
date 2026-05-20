"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonCardGrid } from "@/components/skeletons/skeleton-card";
import { SkeletonChartGrid } from "@/components/skeletons/skeleton-chart";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { DEFAULT_PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";

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

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const { leads, loading, initialize } = useLeadStore();
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, activeWorkspace]);

  // Filter leads by date range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dateRange);
  const filteredLeads = leads.filter(
    (l) => !l.createdAt || l.createdAt.toDate() >= cutoff
  );

  // Leads over time
  const leadsOverTime: Record<string, number> = {};
  for (const lead of filteredLeads) {
    const date = lead.createdAt?.toDate().toLocaleDateString() || "Unknown";
    leadsOverTime[date] = (leadsOverTime[date] || 0) + 1;
  }
  const leadsOverTimeData = Object.entries(leadsOverTime)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, count]) => ({ date, leads: count }));

  // Pipeline distribution
  const pipelineData = DEFAULT_PIPELINE_STAGES.map((stage) => ({
    name: stage.name,
    value: filteredLeads.filter((l) => l.status === stage.id).length,
    color: stage.color,
  })).filter((d) => d.value > 0);

  // Revenue by stage
  const revenueData = DEFAULT_PIPELINE_STAGES.map((stage) => ({
    name: stage.name,
    value: filteredLeads
      .filter((l) => l.status === stage.id)
      .reduce((sum, l) => sum + (l.value || 0), 0),
  })).filter((d) => d.value > 0);

  // Lead sources
  const sourceData = LEAD_SOURCES.map((source) => ({
    name: source.replace(/_/g, " "),
    value: filteredLeads.filter((l) => l.source === source).length,
  })).filter((d) => d.value > 0);

  // KPIs
  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter((l) => l.status === "won").length;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const totalValue = filteredLeads.reduce(
    (sum, l) => sum + (l.value || 0),
    0
  );
  const activeDeals = filteredLeads.filter(
    (l) => !["won", "lost"].includes(l.status)
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 w-32 skeleton rounded-md" />
            <div className="h-4 w-48 skeleton rounded-md" />
          </div>
          <div className="h-10 w-[180px] skeleton rounded-md" />
        </div>
        <SkeletonCardGrid count={4} />
        <SkeletonChartGrid />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Insights into your CRM performance."
        actions={
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
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={totalLeads}
          icon={<Users className="h-5 w-5" />}
          accentColor="info"
        />
        <StatCard
          title="Active Deals"
          value={activeDeals}
          icon={<Target className="h-5 w-5" />}
          accentColor="primary"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="success"
        />
        <StatCard
          title="Win Rate"
          value={`${conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Leads Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsOverTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={leadsOverTimeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/30"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-elevated)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
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

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-elevated)",
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

        {/* Revenue by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/30"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-elevated)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={CHART_COLORS.bar}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-elevated)",
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
      </div>
    </div>
  );
}
