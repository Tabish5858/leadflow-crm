"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { useLeadStore } from "@/lib/stores/leadStore";
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
import { Loader2, TrendingUp, Users, DollarSign, Target } from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#eab308",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#22c55e",
  "#6b7280",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 365 },
];

export default function AnalyticsPage() {
  const [workspaceId] = useState("default");
  const { leads, loading, initialize } = useLeadStore();
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) initialize(workspaceId);
    });
    return () => unsub();
  }, [workspaceId, initialize]);

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
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  const activeDeals = filteredLeads.filter(
    (l) => !["won", "lost"].includes(l.status)
  ).length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Insights into your CRM performance.
          </p>
        </div>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
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
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
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
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
