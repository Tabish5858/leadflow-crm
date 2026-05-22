"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { Lead } from "@/types";
import {
  exportLeadsToCsv,
  downloadExcelFile,
  exportAnalyticsToPdf,
  type AnalyticsMetrics,
} from "@/lib/export";
import { toast } from "@/lib/toast";

interface ExportButtonProps {
  type: "leads" | "analytics";
  data: Lead[] | AnalyticsMetrics;
}

export function ExportButton({ type, data }: ExportButtonProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportCsv = async () => {
    if (type !== "leads") return;
    setExporting("csv");
    try {
      exportLeadsToCsv(data as Lead[]);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (type !== "leads") return;
    setExporting("excel");
    try {
      await downloadExcelFile(data as Lead[]);
      toast.success("Excel exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (type !== "analytics") return;
    setExporting("pdf");
    try {
      exportAnalyticsToPdf(data as AnalyticsMetrics);
      toast.success("PDF report opened in new window");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(null);
    }
  };

  if (type === "leads") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={exporting !== null}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv} disabled={exporting !== null}>
            <FileText className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting !== null}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPdf} disabled={exporting !== null}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
