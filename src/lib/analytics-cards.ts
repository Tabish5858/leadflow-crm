import type { AnalyticsCardConfig } from "@/types";

/**
 * Default analytics cards - matches the hardcoded 12-card layout.
 * Used when a workspace has no `analyticsCards` configured yet.
 */
export const DEFAULT_ANALYTICS_CARDS: AnalyticsCardConfig[] = [
  // ─── KPI row (4 cards) ──────────────────────────────────────────────────
  {
    id: "kpi-total-leads",
    type: "kpi",
    title: "Total Leads",
    metric: "total_leads",
    order: 0,
  },
  {
    id: "kpi-active-deals",
    type: "kpi",
    title: "Active Deals",
    metric: "active_deals",
    order: 1,
  },
  {
    id: "kpi-pipeline-value",
    type: "kpi",
    title: "Pipeline Value",
    metric: "pipeline_value",
    order: 2,
  },
  {
    id: "kpi-win-rate",
    type: "kpi",
    title: "Win Rate",
    metric: "win_rate",
    order: 3,
  },

  // ─── Chart row 1 (4 cards) ────────────────────────────────────────────
  {
    id: "chart-leads-over-time",
    type: "line_chart",
    title: "Leads Over Time",
    metric: "leads_over_time",
    order: 4,
  },
  {
    id: "chart-pipeline-distribution",
    type: "pie_chart",
    title: "Pipeline Distribution",
    metric: "pipeline_distribution",
    order: 5,
  },
  {
    id: "chart-revenue-by-stage",
    type: "bar_chart",
    title: "Revenue by Stage",
    metric: "revenue_by_stage",
    order: 6,
  },
  {
    id: "chart-lead-sources",
    type: "pie_chart",
    title: "Lead Sources",
    metric: "lead_sources",
    order: 7,
  },

  // ─── Advanced row (4 cards) ───────────────────────────────────────────
  {
    id: "adv-conversion-funnel",
    type: "funnel",
    title: "Conversion Funnel",
    metric: "conversion_funnel",
    order: 8,
  },
  {
    id: "adv-top-leads",
    type: "top_leads",
    title: "Top Leads by Value",
    metric: "top_leads_by_value",
    order: 9,
  },
  {
    id: "adv-industry-breakdown",
    type: "bar_chart",
    title: "Industry Breakdown",
    metric: "industry_breakdown",
    order: 10,
  },
  {
    id: "adv-summary",
    type: "summary",
    title: "Summary Metrics",
    metric: "summary_metrics",
    order: 11,
  },
];

/**
 * Available metrics for the "Add Card" dialog.
 * Grouped by card type for the "Add Card" dialog.
 */
export interface MetricOption {
  value: string;
  label: string;
  cardType: AnalyticsCardConfig["type"];
  icon?: string; // lucide icon name (parsed in the dialog)
  description?: string;
  /** Only available for workspace-level data (non-custom-field metrics) */
  isBuiltIn: boolean;
}

export const AVAILABLE_METRICS: MetricOption[] = [
  // KPI metrics
  { value: "total_leads", label: "Total Leads", cardType: "kpi", description: "Count of all leads in the period", isBuiltIn: true },
  { value: "active_deals", label: "Active Deals", cardType: "kpi", description: "Open leads (not won/lost)", isBuiltIn: true },
  { value: "pipeline_value", label: "Pipeline Value", cardType: "kpi", description: "Sum of all open deal values", isBuiltIn: true },
  { value: "win_rate", label: "Win Rate", cardType: "kpi", description: "Percent of closed deals won", isBuiltIn: true },
  { value: "won_leads", label: "Won Deals", cardType: "kpi", description: "Count of won deals", isBuiltIn: true },
  { value: "lost_leads", label: "Lost Deals", cardType: "kpi", description: "Count of lost deals", isBuiltIn: true },
  { value: "avg_deal_size", label: "Avg Deal Size", cardType: "kpi", description: "Average value of won deals", isBuiltIn: true },
  { value: "won_value", label: "Won Revenue", cardType: "kpi", description: "Total revenue from won deals", isBuiltIn: true },
  { value: "conversion_rate", label: "Conversion Rate", cardType: "kpi", description: "Won / total leads (%)", isBuiltIn: true },

  // Chart metrics
  { value: "leads_over_time", label: "Leads Over Time", cardType: "line_chart", description: "Leads created per day", isBuiltIn: true },
  { value: "value_over_time", label: "Value Over Time", cardType: "line_chart", description: "Sum of deal value per day", isBuiltIn: true },
  { value: "pipeline_distribution", label: "Pipeline Distribution", cardType: "pie_chart", description: "Leads per pipeline stage", isBuiltIn: true },
  { value: "lead_sources", label: "Lead Sources", cardType: "pie_chart", description: "Leads by source channel", isBuiltIn: true },
  { value: "revenue_by_stage", label: "Revenue by Stage", cardType: "bar_chart", description: "Revenue per pipeline stage", isBuiltIn: true },
  { value: "industry_breakdown", label: "Industry Breakdown", cardType: "bar_chart", description: "Leads by industry/niche", isBuiltIn: true },
  { value: "conversion_funnel", label: "Conversion Funnel", cardType: "funnel", description: "Progression through stages", isBuiltIn: true },
  { value: "top_leads_by_value", label: "Top Leads by Value", cardType: "top_leads", description: "Highest value leads (top 5)", isBuiltIn: true },
  { value: "summary_metrics", label: "Summary Metrics", cardType: "summary", description: "Key numbers at a glance", isBuiltIn: true },
];

/**
 * Get active analytics cards for a workspace.
 * Falls back to defaults if workspace has no card config.
 */
export function getAnalyticsCards(
  workspaceCards: AnalyticsCardConfig[] | undefined
): AnalyticsCardConfig[] {
  if (!workspaceCards || workspaceCards.length === 0) {
    return DEFAULT_ANALYTICS_CARDS;
  }
  return [...workspaceCards].sort((a, b) => a.order - b.order);
}
