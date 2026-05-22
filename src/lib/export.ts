import type { Lead } from "@/types";

const CSV_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "jobTitle",
  "status",
  "source",
  "niche",
  "country",
  "city",
  "website",
  "linkedin",
  "value",
  "currency",
  "tags",
  "notes",
  "createdAt",
] as const;

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatTimestamp(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function leadToRow(lead: Lead): string[] {
  return [
    lead.firstName,
    lead.lastName,
    lead.email,
    lead.phone ?? "",
    lead.company ?? "",
    lead.jobTitle ?? "",
    lead.status,
    lead.source ?? "",
    lead.niche ?? "",
    lead.country ?? "",
    lead.city ?? "",
    lead.website ?? "",
    lead.linkedin ?? "",
    lead.value?.toString() ?? "0",
    lead.currency,
    (lead.tags ?? []).join("; "),
    lead.notes ?? "",
    formatTimestamp(lead.createdAt),
  ];
}

export function exportLeadsToCsv(leads: Lead[]): void {
  const headerRow = CSV_HEADERS.join(",");
  const dataRows = leads.map((lead) => leadToRow(lead).map(escapeCsvField).join(","));
  const csvContent = [headerRow, ...dataRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportLeadsToExcel(leads: Lead[]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LeadFlow CRM";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Leads", {
    properties: { tabColor: { argb: "FF3B82F8" } },
  });

  const columns = CSV_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 4, 12),
  }));

  worksheet.columns = columns;

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F8" },
  };
  headerRow.height = 25;

  for (const lead of leads) {
    const row = worksheet.addRow({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      jobTitle: lead.jobTitle ?? "",
      status: lead.status,
      source: lead.source ?? "",
      niche: lead.niche ?? "",
      country: lead.country ?? "",
      city: lead.city ?? "",
      website: lead.website ?? "",
      linkedin: lead.linkedin ?? "",
      value: lead.value ?? 0,
      currency: lead.currency,
      tags: (lead.tags ?? []).join("; "),
      notes: lead.notes ?? "",
      createdAt: lead.createdAt ? lead.createdAt.toDate() : new Date(),
    });

    if (lead.value) {
      const valueCell = row.getCell("value");
      valueCell.numFmt = '#,##0.00';
    }

    const dateCell = row.getCell("createdAt");
    dateCell.numFmt = "YYYY-MM-DD";
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: CSV_HEADERS.length },
  };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadExcelFile(leads: Lead[]): Promise<void> {
  const blob = await exportLeadsToExcel(leads);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-export-${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface AnalyticsMetrics {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalValue: number;
  activeDeals: number;
  wonValue: number;
  avgDealSize: number;
  dateRange: string;
  generatedAt: string;
}

export function exportAnalyticsToPdf(metrics: AnalyticsMetrics): void {
  const reportDate = metrics.generatedAt || new Date().toLocaleDateString();
  const dateRange = metrics.dateRange || "All time";

  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LeadFlow Analytics Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1a1a1a; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    .meta { color: #666; margin-bottom: 30px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; }
    .metric { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .metric-label { font-size: 14px; color: #6b7280; }
    .metric-value { font-size: 28px; font-weight: bold; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <h1>LeadFlow Analytics Report</h1>
  <div class="meta">
    <p><strong>Date Range:</strong> ${dateRange}</p>
    <p><strong>Generated:</strong> ${reportDate}</p>
  </div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Total Leads</div>
      <div class="metric-value">${metrics.totalLeads}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Won Deals</div>
      <div class="metric-value" style="color: #16a34a;">${metrics.wonLeads}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Lost Deals</div>
      <div class="metric-value" style="color: #dc2626;">${metrics.lostLeads}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Conversion Rate</div>
      <div class="metric-value">${metrics.conversionRate}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Pipeline Value</div>
      <div class="metric-value">$${metrics.totalValue.toLocaleString()}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Won Revenue</div>
      <div class="metric-value">$${metrics.wonValue.toLocaleString()}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Active Deals</div>
      <div class="metric-value">${metrics.activeDeals}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg Deal Size</div>
      <div class="metric-value">$${Math.round(metrics.avgDealSize).toLocaleString()}</div>
    </div>
  </div>
  <div class="footer">
    <p>Generated by LeadFlow CRM • ${reportDate}</p>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
  } else {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}
