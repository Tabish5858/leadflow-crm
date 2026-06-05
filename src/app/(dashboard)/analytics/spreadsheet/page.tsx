"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { getSpreadsheets, type Spreadsheet } from "@/lib/firebase/spreadsheets";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useHeaderActions } from "@/contexts/header-actions-context";
import { db } from "@/lib/firebase/client";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { toast } from "sonner";
import type { AnalyticsCardConfig, AnalyticsCardType } from "@/types";
import type { IWorkbookData } from "@univerjs/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  FileSpreadsheet,
  BarChart3,
  PieChartIcon,
  LineChartIcon,
  Layers,
  TableIcon,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Hash,
  Users,
  Target,
  ListOrdered,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────────────

interface SheetColumnAnalysis {
  name: string;
  index: number;
  type: "number" | "text" | "boolean" | "empty";
  filled: number;
  empty: number;
  total: number;
  distribution?: { name: string; value: number }[];
  stats?: { min: number; max: number; avg: number; sum: number };
  topValues?: { name: string; value: number }[];
}

interface SheetAnalysis {
  sheetName: string;
  /** Total available rows in the sheet (from metadata) */
  rowCount: number;
  /** Actual rows that have at least one non-empty cell */
  dataRowCount: number;
  colCount: number;
  columns: SheetColumnAnalysis[];
  totalFilled: number;
  totalEmpty: number;
}

type WorkbookAnalysis = SheetAnalysis[];

// ─── Snapshot parser ─────────────────────────────────────────────────────

function analyzeSnapshot(snapshot: IWorkbookData): WorkbookAnalysis {
  const sheetOrder = snapshot.sheetOrder || [];
  if (sheetOrder.length === 0) return [];

  const result: WorkbookAnalysis = [];

  for (const sheetId of sheetOrder) {
    const sheet = snapshot.sheets[sheetId];
    if (!sheet) continue;

    const rowCount = sheet.rowCount || 0;
    const colCount = sheet.columnCount || 0;
    const cellData = sheet.cellData || {};
    const sheetName = sheet.name || "Sheet";

    const columns: SheetColumnAnalysis[] = [];
    let totalFilled = 0;
    let totalEmpty = 0;

    // Headers from row 0
    const headers: string[] = [];
    if (cellData[0]) {
      for (let c = 0; c < colCount; c++) {
        const cell = cellData[0]?.[c];
        headers.push(
          cell?.v !== undefined && cell?.v !== null
            ? String(cell.v).trim()
            : `Column ${c + 1}`
        );
      }
    } else {
      for (let c = 0; c < colCount; c++) headers.push(`Column ${c + 1}`);
    }

    // Track rows that have any data (for dataRowCount)
    const rowsWithData = new Set<number>();

    // Analyze each column (skip header row 0)
    for (let c = 0; c < colCount; c++) {
      const values: { raw: any; str: string; num: number | null }[] = [];
      let filled = 0;
      let empty = 0;

      for (let r = 1; r < rowCount; r++) {
        const cell = cellData[r]?.[c];
        const v = cell?.v;
        if (v !== undefined && v !== null && v !== "") {
          filled++;
          rowsWithData.add(r);
          const str = String(v).trim();
          const num =
            typeof v === "number" ? v : isNaN(Number(v)) ? null : Number(v);
          values.push({ raw: v, str, num });
        } else {
          empty++;
          values.push({ raw: "", str: "", num: null });
        }
      }

      const numCount = values.filter((x) => x.num !== null).length;
      const isNumeric =
        filled > 0 && numCount > 0 && numCount >= filled * 0.5;
      const hasBool = values.some((x) => typeof x.raw === "boolean");

      let colType: SheetColumnAnalysis["type"] = "empty";
      if (filled > 0) {
        if (hasBool) colType = "boolean";
        else if (isNumeric) colType = "number";
        else colType = "text";
      }

      const col: SheetColumnAnalysis = {
        name: headers[c] || `Column ${c + 1}`,
        index: c,
        type: colType,
        filled,
        empty,
        total: rowCount - 1,
      };

      // Distribution for categorical columns
      if (filled > 0) {
        const unique = [
          ...new Set(values.filter((x) => x.str.length > 0).map((x) => x.str)),
        ];
        if (unique.length > 0 && unique.length <= 50) {
          const counts: Record<string, number> = {};
          for (const x of values) {
            if (x.str.length > 0) counts[x.str] = (counts[x.str] || 0) + 1;
          }
          col.distribution = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        }
      }

      // Stats for numeric columns
      if (colType === "number") {
        const nums = values
          .filter((x) => x.num !== null)
          .map((x) => x.num as number);
        if (nums.length > 0) {
          col.stats = {
            min: Math.min(...nums),
            max: Math.max(...nums),
            avg: nums.reduce((s, n) => s + n, 0) / nums.length,
            sum: nums.reduce((s, n) => s + n, 0),
          };
        }
      }

      // Top values for text columns
      if (colType === "text" && col.distribution) {
        col.topValues = col.distribution.slice(0, 15);
      }

      columns.push(col);
      totalFilled += filled;
      totalEmpty += empty;
    }

    // Fix column total & empty to use actual data rows, not sheet max
    const dataRowCount = Math.max(0, rowsWithData.size);
    for (const col of columns) {
      col.total = dataRowCount;
      col.empty = dataRowCount - col.filled;
    }

    // Recalculate totals using only data rows
    totalEmpty = columns.reduce((s, c) => s + c.empty, 0);

    result.push({
      sheetName,
      rowCount,
      dataRowCount,
      colCount,
      columns,
      totalFilled,
      totalEmpty,
    });
  }

  return result;
}

// ─── Chart colors ────────────────────────────────────────────────────────

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#d946ef", "#10b981", "#eab308", "#a855f7",
];

// ─── StatBox for column stats grid ────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-card px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}



// ─── Card system for custom cards ────────────────────────────────────────

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#d946ef", "#10b981", "#eab308", "#a855f7",
];

interface SpMetricOption {
  value: string;
  label: string;
  cardType: AnalyticsCardType;
  description: string;
  needsColumn: boolean;
  isBuiltIn: boolean;
}

const SP_METRICS: SpMetricOption[] = [
  { value: "total_sheets", label: "Total Sheets", cardType: "kpi", description: "Number of sheets in the workbook", needsColumn: false, isBuiltIn: true },
  { value: "total_rows_data", label: "Data Rows", cardType: "kpi", description: "Rows with actual data", needsColumn: false, isBuiltIn: true },
  { value: "total_columns", label: "Total Columns", cardType: "kpi", description: "Sum of columns across all sheets", needsColumn: false, isBuiltIn: true },
  { value: "filled_cells", label: "Filled Cells", cardType: "kpi", description: "Non-empty cells across workbook", needsColumn: false, isBuiltIn: true },
  { value: "empty_cells", label: "Empty Cells", cardType: "kpi", description: "Empty cells across workbook", needsColumn: false, isBuiltIn: true },
  { value: "fill_rate", label: "Fill Rate", cardType: "kpi", description: "Percentage of filled cells", needsColumn: false, isBuiltIn: true },
  { value: "column_distribution_pie", label: "Column Distribution (Pie)", cardType: "pie_chart", description: "Distribution of values in a column", needsColumn: true, isBuiltIn: true },
  { value: "column_distribution_bar", label: "Column Distribution (Bar)", cardType: "bar_chart", description: "Distribution of values in a column", needsColumn: true, isBuiltIn: true },
  { value: "column_stats", label: "Column Stats", cardType: "kpi", description: "Min/Max/Avg/Sum for numeric column", needsColumn: true, isBuiltIn: true },
  { value: "sheet_summary", label: "Sheet Summary", cardType: "summary", description: "Overview of all columns", needsColumn: false, isBuiltIn: true },
  { value: "auto_column_type_chart", label: "Column Types", cardType: "pie_chart", description: "Distribution of column types (text, number, boolean)", needsColumn: false, isBuiltIn: true },
  { value: "auto_data_density_chart", label: "Data Density", cardType: "pie_chart", description: "Filled vs empty cells", needsColumn: false, isBuiltIn: true },
  { value: "auto_column_fill_chart", label: "Top Columns by Fill", cardType: "bar_chart", description: "Columns with most filled data", needsColumn: false, isBuiltIn: true },
];

const DEFAULT_SP_CARDS: AnalyticsCardConfig[] = [
  { id: "sp-kpi-sheets", type: "kpi", title: "Total Sheets", metric: "total_sheets", order: 0 },
  { id: "sp-kpi-rows", type: "kpi", title: "Data Rows", metric: "total_rows_data", order: 1 },
  { id: "sp-kpi-cols", type: "kpi", title: "Total Columns", metric: "total_columns", order: 2 },
  { id: "sp-kpi-fill-rate", type: "kpi", title: "Fill Rate", metric: "fill_rate", order: 3 },
  { id: "sp-col-type", type: "pie_chart", title: "Column Types", metric: "auto_column_type_chart", order: 4 },
  { id: "sp-data-density", type: "pie_chart", title: "Data Density", metric: "auto_data_density_chart", order: 5 },
  { id: "sp-col-fill", type: "bar_chart", title: "Top Columns by Fill", metric: "auto_column_fill_chart", order: 6 },
  { id: "sp-summary", type: "summary", title: "Sheet Summary", metric: "sheet_summary", order: 7 },
];

function getSpCards(workspaceCards: AnalyticsCardConfig[] | undefined): AnalyticsCardConfig[] {
  if (!workspaceCards || workspaceCards.length === 0) return DEFAULT_SP_CARDS;
  return [...workspaceCards].sort((a, b) => a.order - b.order);
}

function sumAcrossSheets(analysis: WorkbookAnalysis, fn: (s: SheetAnalysis) => number): number {
  return analysis.reduce((sum, s) => sum + fn(s), 0);
}

interface MetricContext {
  analysis: WorkbookAnalysis;
  selectedColumnIndex: number | null;
  activeSheetIndex: number;
}

function resolveMetricValue(
  metric: string,
  ctx: MetricContext
): {
  value: string | number;
  icon: React.ReactNode;
  accent: "info" | "primary" | "success" | "warning" | "default";
} {
  const totalDataRows = sumAcrossSheets(ctx.analysis, (s) => s.dataRowCount);
  const totalCols = sumAcrossSheets(ctx.analysis, (s) => s.colCount);
  const totalFilled = sumAcrossSheets(ctx.analysis, (s) => s.totalFilled);
  const totalEmpty = sumAcrossSheets(ctx.analysis, (s) => s.totalEmpty);
  const fillRate =
    totalFilled + totalEmpty > 0
      ? Math.round((totalFilled / (totalFilled + totalEmpty)) * 100)
      : 0;

  switch (metric) {
    case "total_sheets":
      return { value: ctx.analysis.length, icon: <Layers className="h-5 w-5" />, accent: "info" };
    case "total_rows":
    case "total_rows_data":
      return { value: totalDataRows.toLocaleString(), icon: <ListOrdered className="h-5 w-5" />, accent: "primary" };
    case "total_columns":
      return { value: totalCols.toLocaleString(), icon: <TableIcon className="h-5 w-5" />, accent: "success" };
    case "filled_cells":
      return { value: totalFilled.toLocaleString(), icon: <Users className="h-5 w-5" />, accent: "success" };
    case "empty_cells":
      return { value: totalEmpty.toLocaleString(), icon: <X className="h-5 w-5" />, accent: "warning" };
    case "fill_rate":
      return { value: `${fillRate}%`, icon: <Target className="h-5 w-5" />, accent: "primary" };
    case "column_stats": {
      if (ctx.selectedColumnIndex === null)
        return { value: "—", icon: <Hash className="h-5 w-5" />, accent: "default" };
      const activeSheet = ctx.analysis[ctx.activeSheetIndex];
      if (!activeSheet) return { value: "—", icon: <Hash className="h-5 w-5" />, accent: "default" };
      const col = activeSheet.columns[ctx.selectedColumnIndex];
      if (!col?.stats) return { value: "—", icon: <Hash className="h-5 w-5" />, accent: "default" };
      return { value: `${col.stats.min}–${col.stats.max}`, icon: <Hash className="h-5 w-5" />, accent: "info" };
    }
    default:
      return { value: "—", icon: <BarChart3 className="h-5 w-5" />, accent: "default" };
  }
}

function renderCustomCard(card: AnalyticsCardConfig, ctx: MetricContext): React.ReactNode {
  if (card.type === "kpi") {
    if (card.metric === "column_stats") {
      const activeSheet = ctx.analysis[ctx.activeSheetIndex];
      if (!activeSheet || ctx.selectedColumnIndex === null) {
        return <div className="p-4 text-sm text-muted-foreground">Select a numeric column</div>;
      }
      const col = activeSheet.columns[ctx.selectedColumnIndex];
      if (!col?.stats) return <div className="p-4 text-sm text-muted-foreground">Column has no numeric data</div>;
      return (
        <div className="grid grid-cols-2 gap-3 p-4">
          <StatBox label="Min" value={col.stats.min.toLocaleString()} />
          <StatBox label="Max" value={col.stats.max.toLocaleString()} />
          <StatBox label="Avg" value={col.stats.avg.toFixed(1)} />
          <StatBox label="Sum" value={col.stats.sum.toLocaleString()} />
        </div>
      );
    }
    const resolved = resolveMetricValue(card.metric, ctx);
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {resolved.icon}
          {card.title}
        </div>
        <div className="text-2xl font-bold">{resolved.value}</div>
      </div>
    );
  }

  if (card.type === "pie_chart") {
    const activeSheet = ctx.analysis[ctx.activeSheetIndex];
    let pieData: { name: string; value: number }[] = [];

    if (card.metric === "auto_column_type_chart") {
      // Count columns by type across all sheets
      const typeCounts: Record<string, number> = {};
      for (const sheet of ctx.analysis) {
        for (const col of sheet.columns) {
          typeCounts[col.type] = (typeCounts[col.type] || 0) + 1;
        }
      }
      pieData = Object.entries(typeCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    } else if (card.metric === "auto_data_density_chart") {
      const totalFilled = sumAcrossSheets(ctx.analysis, (s) => s.totalFilled);
      const totalEmpty = sumAcrossSheets(ctx.analysis, (s) => s.totalEmpty);
      pieData = [
        { name: "Filled", value: totalFilled },
        { name: "Empty", value: totalEmpty },
      ];
    } else if (card.customFieldId && activeSheet) {
      const colIdx = parseInt(card.customFieldId, 10);
      const col = activeSheet.columns[colIdx];
      if (col?.distribution) pieData = col.distribution;
    }

    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={2} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  fill="hsl(var(--foreground))" fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "bar_chart") {
    const activeSheet = ctx.analysis[ctx.activeSheetIndex];
    let barData: { name: string; value: number }[] = [];

    if (card.metric === "auto_column_fill_chart") {
      // Top 12 columns by fill count across the active sheet
      if (activeSheet) {
        barData = [...activeSheet.columns]
          .sort((a, b) => b.filled - a.filled)
          .slice(0, 12)
          .map((col) => ({ name: col.name, value: col.filled }));
      }
    } else if (card.customFieldId && activeSheet) {
      const colIdx = parseInt(card.customFieldId, 10);
      const col = activeSheet.columns[colIdx];
      if (col?.distribution) barData = col.distribution;
    }

    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
        <CardContent>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="value" fill="hsl(152 55% 42%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "summary") {
    const activeSheet = ctx.analysis[ctx.activeSheetIndex];
    if (!activeSheet) return <div className="p-4 text-sm text-muted-foreground">No sheet data</div>;
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{card.title}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sheet</span>
              <span className="text-sm font-medium">{activeSheet.sheetName}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data Rows</span>
              <span className="text-lg font-bold">{activeSheet.dataRowCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Columns</span>
              <span className="text-lg font-bold">{activeSheet.colCount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Filled Cells</span>
              <span className="text-lg font-bold text-green-600">{activeSheet.totalFilled.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Empty Cells</span>
              <span className="text-lg font-bold text-red-600">{activeSheet.totalEmpty.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fill Rate</span>
              <span className="text-lg font-bold">
                {activeSheet.totalFilled + activeSheet.totalEmpty > 0
                  ? Math.round((activeSheet.totalFilled / (activeSheet.totalFilled + activeSheet.totalEmpty)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ─── Add Card Dialog ────────────────────────────────────────────────────

const CARD_TYPE_ICONS: Record<AnalyticsCardType, React.ReactNode> = {
  kpi: <BarChart3 className="h-4 w-4" />,
  line_chart: <LineChartIcon className="h-4 w-4" />,
  pie_chart: <PieChartIcon className="h-4 w-4" />,
  bar_chart: <BarChart3 className="h-4 w-4" />,
  funnel: <BarChart3 className="h-4 w-4" />,
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

function AddSpCardDialog({
  open,
  onOpenChange,
  existingCards,
  onAdd,
  columns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCards: AnalyticsCardConfig[];
  onAdd: (metric: string, columnIndex?: string) => void;
  columns: SheetColumnAnalysis[];
}) {
  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [filterType, setFilterType] = useState<AnalyticsCardType | "all">("all");

  const option = SP_METRICS.find((m) => m.value === selectedMetric);
  const needsColumn = option?.needsColumn || false;
  const isColStats = selectedMetric === "column_stats";
  const pickableColumns = isColStats
    ? columns.filter((c) => c.type === "number")
    : columns.filter((c) => c.filled > 0);

  const canAdd = selectedMetric && (!needsColumn || selectedColumn);

  const filteredMetrics = SP_METRICS.filter((m) => {
    if (filterType !== "all" && m.cardType !== filterType) return false;
    if (existingCards.find((c) => c.metric === m.value && c.customFieldId === undefined)) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Analytics Card</DialogTitle>
          <DialogDescription>
            Select a metric to add to your spreadsheet analytics dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={filterType === "all" ? "default" : "outline"} className="cursor-pointer"
              onClick={() => { setFilterType("all"); setSelectedMetric(""); }}>
              All
            </Badge>
            {(["kpi", "pie_chart", "bar_chart", "summary"] as AnalyticsCardType[]).map((type) => (
              <Badge key={type} variant={filterType === type ? "default" : "outline"} className="cursor-pointer"
                onClick={() => { setFilterType(type); setSelectedMetric(""); }}>
                {CARD_TYPE_ICONS[type]}
                <span className="ml-1">{CARD_TYPE_LABELS[type]}</span>
              </Badge>
            ))}
          </div>
          <Select value={selectedMetric} onValueChange={(v) => { setSelectedMetric(v); setSelectedColumn(""); }}>
            <SelectTrigger><SelectValue placeholder="Pick a metric..." /></SelectTrigger>
            <SelectContent>
              {filteredMetrics.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{CARD_TYPE_ICONS[m.cardType]}</span>
                    {m.label}
                  </span>
                </SelectItem>
              ))}
              {filteredMetrics.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">No metrics available</div>
              )}
            </SelectContent>
          </Select>
          {needsColumn && (
            <>
              {pickableColumns.length > 0 ? (
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                  <SelectContent>
                    {pickableColumns.map((col, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {col.name}
                        {col.type === "number" && col.stats ? ` (${col.stats.min}–${col.stats.max})` : ""}
                        {col.type !== "number" ? ` (${col.filled} filled)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isColStats ? "No numeric columns found." : "No columns with data found."}
                </p>
              )}
            </>
          )}
          <Button className="w-full" disabled={!canAdd}
            onClick={() => onAdd(selectedMetric, selectedColumn || undefined)}>
            <Plus className="mr-2 h-4 w-4" /> Add Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CardEditOverlay({
  card, cards, onReorder, onRemove,
}: {
  card: AnalyticsCardConfig;
  cards: AnalyticsCardConfig[];
  onReorder: (id: string, dir: "up" | "down") => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="absolute -top-2 -right-2 z-10 flex gap-0.5">
      <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full shadow"
        onClick={() => onReorder(card.id, "up")} disabled={card.order === 0}>
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full shadow"
        onClick={() => onReorder(card.id, "down")} disabled={card.order === cards.length - 1}>
        <ChevronDown className="h-3 w-3" />
      </Button>
      <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full shadow"
        onClick={() => onRemove(card.id)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════

export default function SpreadsheetAnalyticsPage() {
  const { activeWorkspace, user } = useWorkspace();
  const { setHeaderActions } = useHeaderActions();

  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>("");
  const [selectedSnapshot, setSelectedSnapshot] = useState<IWorkbookData | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const [analysis, setAnalysis] = useState<WorkbookAnalysis>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isAdmin =
    user?.role === "owner" || user?.role === "admin" || activeWorkspace?.ownerId === user?.id;

  // ─── Fetch spreadsheets ──────────────────────────────────────────────

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    setLoadingList(true);
    getSpreadsheets(activeWorkspace.id)
      .then((list) => {
        if (cancelled) return;
        setSpreadsheets(list);
        if (!selectedSpreadsheetId && list.length > 0) {
          setSelectedSpreadsheetId(list[0].id);
        }
      })
      .catch(() => { if (!cancelled) toast.error("Failed to load spreadsheets"); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [activeWorkspace, selectedSpreadsheetId]);

  // ─── Load snapshot ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedSpreadsheetId || !activeWorkspace) return;
    setLoadingSnapshot(true);
    setSelectedSnapshot(null);
    setAnalysis([]);

    import("@/lib/firebase/spreadsheets").then(({ getSpreadsheet }) => {
      getSpreadsheet(activeWorkspace.id, selectedSpreadsheetId)
        .then((sp) => {
          if (sp?.snapshot) setSelectedSnapshot(sp.snapshot);
          else setSelectedSnapshot(null);
        })
        .catch(() => toast.error("Failed to load spreadsheet"))
        .finally(() => setLoadingSnapshot(false));
    });
  }, [selectedSpreadsheetId, activeWorkspace]);

  // ─── Analyze ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedSnapshot) { setAnalysis([]); return; }
    const result = analyzeSnapshot(selectedSnapshot);
    setAnalysis(result);
    setActiveSheetIndex(0);
    setSelectedColumnIndex(null);
  }, [selectedSnapshot]);

  // ─── Cards ───────────────────────────────────────────────────────────

  const activeCards = useMemo(
    () => getSpCards((activeWorkspace as any)?.spreadsheetAnalyticsCards),
    [activeWorkspace]
  );

  const saveCards = useCallback(
    async (cards: AnalyticsCardConfig[]) => {
      if (!activeWorkspace) return;
      try {
        const sanitized = cards.map((c) =>
          Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined))
        );
        await updateDoc(doc(db, "workspaces", activeWorkspace.id), {
          spreadsheetAnalyticsCards: sanitized,
        });
      } catch {
        toast.error("Failed to save layout");
      }
    },
    [activeWorkspace]
  );

  const handleReorder = useCallback(
    (cardId: string, direction: "up" | "down") => {
      const cards = getSpCards((activeWorkspace as any)?.spreadsheetAnalyticsCards);
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= cards.length) return;
      [cards[idx], cards[targetIdx]] = [cards[targetIdx], cards[idx]];
      saveCards(cards.map((c, i) => ({ ...c, order: i })));
    },
    [activeWorkspace, saveCards]
  );

  const handleRemove = useCallback(
    (cardId: string) => {
      const cards = getSpCards((activeWorkspace as any)?.spreadsheetAnalyticsCards);
      saveCards(
        cards
          .filter((c) => c.id !== cardId)
          .map((c, i) => ({ ...c, order: i }))
      );
      toast.success("Card removed");
    },
    [activeWorkspace, saveCards]
  );

  const handleAddCard = useCallback(
    (metric: string, columnIndex?: string) => {
      const cards = getSpCards((activeWorkspace as any)?.spreadsheetAnalyticsCards);
      const option = SP_METRICS.find((m) => m.value === metric);
      if (!option) return;
      const newCard: AnalyticsCardConfig = {
        id: `sp-card-${Date.now()}`,
        type: option.cardType,
        title:
          option.needsColumn && columnIndex
            ? `${option.label} — ${
                analysis[activeSheetIndex]?.columns[parseInt(columnIndex)]?.name || "Column"
              }`
            : option.label,
        metric,
        customFieldId: columnIndex || undefined,
        order: cards.length,
      };
      saveCards([...cards, newCard]);
      setAddDialogOpen(false);
      toast.success("Card added");
    },
    [activeWorkspace, saveCards, analysis, activeSheetIndex]
  );

  const handleResetToDefault = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      await updateDoc(doc(db, "workspaces", activeWorkspace.id), {
        spreadsheetAnalyticsCards: deleteField(),
      });
      toast.success("Layout reset to default");
    } catch {
      toast.error("Failed to reset layout");
    }
  }, [activeWorkspace]);

  // ─── Header actions ──────────────────────────────────────────────────

  const headerActions = useMemo(
    () =>
      analysis.length > 0 && isAdmin ? (
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {editMode ? "Done" : "Edit Cards"}
        </Button>
      ) : null,
    [isAdmin, editMode, analysis.length]
  );

  useEffect(() => {
    setHeaderActions(headerActions);
    return () => setHeaderActions(null);
  }, [headerActions, setHeaderActions]);

  // ─── Derived ─────────────────────────────────────────────────────────

  const activeColumns = analysis[activeSheetIndex]?.columns || [];
  const activeSheet = analysis[activeSheetIndex];

  const metricCtx: MetricContext = useMemo(
    () => ({ analysis, selectedColumnIndex, activeSheetIndex }),
    [analysis, selectedColumnIndex, activeSheetIndex]
  );

  // ─── Loading ─────────────────────────────────────────────────────────

  if (loadingList) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Toolbar: selector + picks ──────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Spreadsheet:</span>
        </div>
        {spreadsheets.length > 0 ? (
          <Select value={selectedSpreadsheetId} onValueChange={setSelectedSpreadsheetId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a spreadsheet..." />
            </SelectTrigger>
            <SelectContent>
              {spreadsheets.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            No spreadsheets yet.{" "}
            <Link href="/leads/spreadsheet" className="underline">
              Create one
            </Link>
          </p>
        )}

        {analysis.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Sheet:</span>
            <Select
              value={activeSheetIndex.toString()}
              onValueChange={(v) => {
                setActiveSheetIndex(parseInt(v));
                setSelectedColumnIndex(null);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {analysis.map((s, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {s.sheetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ─── No sheet selected ──────────────────────────────────────── */}
      {!selectedSpreadsheetId && spreadsheets.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Select a spreadsheet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a spreadsheet from the dropdown above to view its analytics.
          </p>
        </div>
      )}

      {/* ─── Loading ────────────────────────────────────────────────── */}
      {loadingSnapshot && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* ─── Empty ──────────────────────────────────────────────────── */}
      {!loadingSnapshot && selectedSpreadsheetId && analysis.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <TableIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No data in this spreadsheet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add data to the spreadsheet first, then check back.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* DATA LOADED — show analytics */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!loadingSnapshot && analysis.length > 0 && activeSheet && (
        <>
          {/* ─── Summary bar (like editor panel) ──────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Data Rows"
              value={activeSheet.dataRowCount.toLocaleString()}
              icon={<ListOrdered className="h-4 w-4" />}
            />
            <SummaryCard
              label="Columns"
              value={activeSheet.colCount.toString()}
              icon={<Hash className="h-4 w-4" />}
            />
            <SummaryCard
              label="Filled Cells"
              value={activeSheet.totalFilled.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
            />
            <SummaryCard
              label="Fill Rate"
              value={
                activeSheet.totalFilled + activeSheet.totalEmpty > 0
                  ? `${Math.round(
                      (activeSheet.totalFilled /
                        (activeSheet.totalFilled + activeSheet.totalEmpty)) *
                        100
                    )}%`
                  : "0%"
              }
              icon={<Target className="h-4 w-4" />}
            />
          </div>

          {/* ─── Analytics Cards ────────────────────────────────────── */}
          {activeCards.length > 0 && (
            <div>

              {/* KPI cards */}
              {activeCards.filter((c) => c.type === "kpi" && c.metric !== "column_stats").length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  {activeCards
                    .filter((c) => c.type === "kpi" && c.metric !== "column_stats")
                    .map((card) => (
                      <div key={card.id} className="relative rounded-lg border bg-card group/card">
                        {editMode && (
                          <CardEditOverlay
                            card={card}
                            cards={activeCards}
                            onReorder={handleReorder}
                            onRemove={handleRemove}
                          />
                        )}
                        {renderCustomCard(card, metricCtx)}
                      </div>
                    ))}
                </div>
              )}

              {/* Column stats KPI */}
              {activeCards.filter((c) => c.metric === "column_stats").length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  {activeCards
                    .filter((c) => c.metric === "column_stats")
                    .map((card) => (
                      <div key={card.id} className="relative group/card">
                        {editMode && (
                          <CardEditOverlay
                            card={card}
                            cards={activeCards}
                            onReorder={handleReorder}
                            onRemove={handleRemove}
                          />
                        )}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">{card.title}</CardTitle>
                          </CardHeader>
                          <CardContent>{renderCustomCard(card, metricCtx)}</CardContent>
                        </Card>
                      </div>
                    ))}
                </div>
              )}

              {/* Non-KPI cards */}
              {activeCards.filter((c) => c.type !== "kpi").length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeCards
                    .filter((c) => c.type !== "kpi")
                    .map((card) => (
                      <div key={card.id} className="relative group/card">
                        {editMode && (
                          <CardEditOverlay
                            card={card}
                            cards={activeCards}
                            onReorder={handleReorder}
                            onRemove={handleRemove}
                          />
                        )}
                        {renderCustomCard(card, metricCtx)}
                      </div>
                    ))}
                </div>
              )}

              {/* Edit actions */}
              {editMode && (
                <div className="flex gap-2 mt-4">
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
                    onClick={handleResetToDefault}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset to Default
                  </Button>
                </div>
              )}

              <AddSpCardDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                existingCards={activeCards}
                onAdd={handleAddCard}
                columns={activeColumns}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
