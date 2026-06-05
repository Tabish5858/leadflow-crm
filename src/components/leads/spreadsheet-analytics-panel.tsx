"use client";

import { useEffect, useState, useRef } from "react";
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
} from "recharts";
import { X, BarChart3, Hash, Type, AlertCircle } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#d946ef", "#10b981", "#eab308", "#a855f7",
];

const DROPDOWN_COLUMNS: Record<string, string[]> = {
  "Preferred Contact": ["WhatsApp", "Email", "See WA (If Any)"],
  "Qualification Reason": [
    "User Interface (UI) Is Not Good.",
    "This Business Do Not Have A Website.",
    "Site Not Opening.",
    "SSL Is Expired.",
    "Using 3rd Party.",
  ],
  "Message 01": ["Pending", "Sent"],
  "Follow Up 01": ["Pending", "Sent"],
  "Follow Up 02": ["Pending", "Sent"],
  "Response": ["Responded", "Not Responded", "Not Interested", "Bounced Back"],
};

type ColumnProfile = {
  index: number;
  name: string;
  type: "dropdown" | "number" | "text" | "empty";
  total: number;
  filled: number;
  empty: number;
  /** For dropdown: count per option */
  distribution?: { name: string; value: number }[];
  /** For numbers */
  stats?: { min: number; max: number; avg: number; sum: number };
  /** For text: top value counts */
  topValues?: { name: string; value: number }[];
};

interface Props {
  univerAPI: any;
  open: boolean;
  onClose: () => void;
}

export function SpreadsheetAnalyticsPanel({ univerAPI, open, onClose }: Props) {
  const [columns, setColumns] = useState<ColumnProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !univerAPI) return;
    setLoading(true);
    setError(null);

    // Use requestIdleCallback or setTimeout to avoid blocking the UI
    const timer = setTimeout(() => {
      try {
        const { columns: cols, rowCount } = analyzeSheet(univerAPI);
        setColumns(cols);
        setTotalRows(rowCount);
      } catch (err: any) {
        setError(err.message || "Failed to analyze sheet");
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, univerAPI]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="w-96 border-l bg-background flex flex-col h-full overflow-hidden animate-in slide-in-from-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Close analytics"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Analyzing sheet data…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && columns.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No data found. Import a CSV or add data to the sheet.
          </div>
        )}

        {!loading && !error && columns.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Total Rows"
                value={totalRows.toLocaleString()}
                icon={<Type className="h-4 w-4" />}
              />
              <SummaryCard
                label="Columns"
                value={columns.length.toString()}
                icon={<Hash className="h-4 w-4" />}
              />
            </div>

            {/* Column profiles */}
            {columns.map((col) => (
              <ColumnSection key={col.index} col={col} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function ColumnSection({ col }: { col: ColumnProfile }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{col.name}</span>
          <TypeBadge type={col.type} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {col.filled}/{col.total} filled
        </span>
      </div>

      {/* Progress bar: filled vs empty */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${col.total > 0 ? (col.filled / col.total) * 100 : 0}%` }}
        />
      </div>

      {/* Distribution chart for dropdown / categorical */}
      {col.distribution && col.distribution.length > 0 && (
        <div className="pt-1">
          <BarChartChart data={col.distribution} />
        </div>
      )}

      {/* Pie chart for dropdown with few options */}
      {col.distribution && col.distribution.length <= 6 && col.distribution.length > 0 && (
        <div className="pt-1">
          <PieChartChart data={col.distribution} />
        </div>
      )}

      {/* Number stats */}
      {col.stats && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <StatBox label="Min" value={col.stats.min.toLocaleString()} />
          <StatBox label="Max" value={col.stats.max.toLocaleString()} />
          <StatBox label="Avg" value={col.stats.avg.toFixed(1)} />
          <StatBox label="Sum" value={col.stats.sum.toLocaleString()} />
        </div>
      )}

      {/* Top text values */}
      {col.topValues && col.topValues.length > 0 && (
        <div className="pt-1">
          <BarChartChart data={col.topValues} />
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: ColumnProfile["type"] }) {
  const map: Record<string, { label: string; className: string }> = {
    dropdown: { label: "Dropdown", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    number: { label: "Number", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    text: { label: "Text", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    empty: { label: "Empty", className: "bg-muted text-muted-foreground" },
  };
  const m = map[type] || map.text;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${m.className}`}>
      {m.label}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-card px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function BarChartChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return null;
  const top = data.slice(0, 15); // cap at 15 bars
  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} margin={{ top: 4, right: 4, bottom: 4, left: -12 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={40}
          />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value: number) => [value.toLocaleString(), "Count"]}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return null;
  return (
    <div className="w-full h-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={55}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value: number) => [value.toLocaleString(), "Count"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Sheet analyzer ──────────────────────────────────────────────────────────

function analyzeSheet(univerAPI: any): {
  columns: ColumnProfile[];
  rowCount: number;
} {
  const workbook = univerAPI.getActiveWorkbook();
  const sheet = workbook.getActiveSheet();

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // Need at least a header row and 1 data row
  if (lastRow < 1 || lastCol < 0) {
    return { columns: [], rowCount: 0 };
  }

  const rowCount = lastRow; // 0-indexed → number of data rows (row 0 = header)
  const colCount = lastCol + 1;

  // Read the full data range: row 0 is header, rows 1..lastRow are data
  const headerRange = sheet.getRange(0, 0, 1, colCount);
  const rawHeaders: string[][] = headerRange.getValues();
  const headers: string[] = rawHeaders[0] || [];

  const dataRange = sheet.getRange(1, 0, rowCount, colCount);
  const rawData: string[][] = dataRange.getValues();

  const columns: ColumnProfile[] = [];

  for (let c = 0; c < colCount; c++) {
    const name = headers[c]?.toString().trim() || `Column ${c + 1}`;
    const values: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      const val = rawData[r]?.[c];
      values.push(val !== null && val !== undefined ? String(val).trim() : "");
    }

    const filled = values.filter((v) => v.length > 0).length;
    const empty = values.filter((v) => v.length === 0).length;

    // Determine column type
    const isDropdown = name in DROPDOWN_COLUMNS;
    const numValues = values.map(Number).filter((n) => !isNaN(n));
    const isNumeric = !isDropdown && numValues.length > 0 && numValues.length >= filled * 0.5;
    const uniqueValues = [...new Set(values.filter((v) => v.length > 0))];

    const col: ColumnProfile = {
      index: c,
      name,
      type: isDropdown ? "dropdown" : isNumeric ? "number" : filled > 0 ? "text" : "empty",
      total: rowCount,
      filled,
      empty,
    };

    if (isDropdown) {
      // Count occurrences of each known option + "Other"
      const counts: Record<string, number> = {};
      const knownOptions = DROPDOWN_COLUMNS[name];
      for (const opt of knownOptions) counts[opt] = 0;
      counts["(other)"] = 0;
      let otherCount = 0;
      for (const v of values) {
        if (v.length === 0) continue;
        if (knownOptions.includes(v)) {
          counts[v] = (counts[v] || 0) + 1;
        } else {
          otherCount++;
        }
      }
      if (otherCount > 0) counts["(other)"] = otherCount;

      col.distribution = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    if (isNumeric) {
      const nums = numValues as number[];
      col.stats = {
        min: Math.min(...nums),
        max: Math.max(...nums),
        avg: nums.reduce((s, n) => s + n, 0) / nums.length,
        sum: nums.reduce((s, n) => s + n, 0),
      };
    }

    if (!isDropdown && !isNumeric && uniqueValues.length > 0 && uniqueValues.length <= 30) {
      const counts: Record<string, number> = {};
      for (const v of values) {
        if (v.length === 0) continue;
        counts[v] = (counts[v] || 0) + 1;
      }
      col.topValues = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    }

    columns.push(col);
  }

  return { columns, rowCount };
}
