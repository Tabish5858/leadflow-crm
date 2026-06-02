"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonCardGrid } from "@/components/skeletons/skeleton-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHeaderActions } from "@/contexts/header-actions-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { getLeadStats } from "@/lib/firebase/firestore";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, DollarSign, Plus, Target, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Stats {
  total: number;
  totalValue: number;
  forecastedRevenue: number;
  byStatus: Record<string, number>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const { canAccess } = usePermissions();
  const { setHeaderActions } = useHeaderActions();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    getLeadStats(activeWorkspace.id, activeWorkspace.pipeline?.stages)
      .then((data) => {
        setStats(data);
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id, activeWorkspace]);

  const activeDeals = stats
    ? (stats.byStatus["new"] || 0) +
    (stats.byStatus["contacted"] || 0) +
    (stats.byStatus["qualified"] || 0) +
    (stats.byStatus["proposal"] || 0) +
    (stats.byStatus["negotiation"] || 0)
    : 0;

  const conversionRate =
    stats && stats.total > 0
      ? Math.round(((stats.byStatus["won"] || 0) / stats.total) * 100)
      : 0;

  const totalLeads = stats?.total ?? 0;
  const statusRows = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "proposal", label: "Proposal" },
    { key: "negotiation", label: "Negotiation" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
  ].map((row) => {
    const count = stats?.byStatus[row.key] || 0;
    const percent = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    return { ...row, count, percent };
  });

  const showPipelineCard = canAccess("leads") || canAccess("pipeline");
  const showQuickActions =
    canAccess("leads") ||
    canAccess("pipeline") ||
    canAccess("messages") ||
    canAccess("analytics");
  const canAddLeads = canAccess("leads");

  useEffect(() => {
    if (loading || !canAddLeads) {
      setHeaderActions(null);
      return;
    }
    setHeaderActions(
      <Button size="sm" onClick={() => router.push("/leads")}>
        <Plus className="mr-2 h-4 w-4" />
        Add Lead
      </Button>
    );
    return () => setHeaderActions(null);
  }, [canAddLeads, loading, router, setHeaderActions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCardGrid count={4} />
      </div>
    );
  }

  return (
    <RequireModuleAccess moduleId="dashboard">
      <div className="space-y-6">
        {/* KPI Cards - filtered by module access */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {canAccess("leads") && (
            <StatCard
              title="Total Leads"
              value={stats?.total ?? 0}
              icon={<Users className="h-5 w-5" />}
              accentColor="info"
            />
          )}
          {canAccess("pipeline") && (
            <StatCard
              title="Active Deals"
              value={activeDeals}
              icon={<Target className="h-5 w-5" />}
              accentColor="primary"
            />
          )}
          {canAccess("pipeline") && (
            <StatCard
              title="Pipeline Value"
              value={formatCurrency(stats?.totalValue ?? 0)}
              icon={<DollarSign className="h-5 w-5" />}
              accentColor="success"
            />
          )}
          {canAccess("pipeline") && (
            <StatCard
              title="Forecasted Revenue"
              value={formatCurrency(stats?.forecastedRevenue ?? 0)}
              icon={<BarChart3 className="h-5 w-5" />}
              accentColor="warning"
            />
          )}
          {canAccess("analytics") && (
            <StatCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              accentColor="info"
            />
          )}
        </div>

        {(showPipelineCard || showQuickActions) && (
          <div className="grid gap-4 lg:grid-cols-3">
            {showPipelineCard && (
              <Card className={showQuickActions ? "lg:col-span-2" : undefined}>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline Breakdown</CardTitle>
                  <CardDescription>Lead distribution across stages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {statusRows.map((row) => (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{row.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary/70"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {showQuickActions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription>Jump back into common work.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {canAccess("leads") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/leads")}
                    >
                      View Leads
                    </Button>
                  )}
                  {canAccess("pipeline") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/pipeline")}
                    >
                      View Pipeline
                    </Button>
                  )}
                  {canAccess("messages") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/messages")}
                    >
                      Open Messages
                    </Button>
                  )}
                  {canAccess("analytics") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/analytics")}
                    >
                      View Analytics
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State / Getting Started - only if leads access */}
        {stats?.total === 0 && canAccess("leads") && (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No leads yet"
            description="Start building your pipeline by adding your first lead. Track deals, manage contacts, and close more sales."
            actionLabel="Add Your First Lead"
            onAction={() => router.push("/leads")}
          />
        )}
        {/* Show info when no accessible modules have data */}
        {stats?.total === 0 && !canAccess("leads") && (
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="Welcome to LeadFlow"
            description="Your workspace admin has configured module access. Contact them to adjust your permissions."
          />
        )}
      </div>
    </RequireModuleAccess>
  );
}
