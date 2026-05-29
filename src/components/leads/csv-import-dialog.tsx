"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  parseCsv,
  leadsToCsv,
  downloadCsv,
  mapCsvRowToLead,
  getLeadFieldsWithCustom,
  type MappedLead,
  type CsvImportResult,
} from "@/lib/csv";
import type { Lead, CustomField } from "@/types";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (leads: Omit<Lead, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  existingLeads: Lead[];
  customFields?: CustomField[];
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
  existingLeads,
  customFields = [],
}: CsvImportDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing">("upload");
  const [csvData, setCsvData] = useState<CsvImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedLeads, setMappedLeads] = useState<MappedLead[]>([]);
  const [importStats, setImportStats] = useState<{ added: number; skipped: number }>({
    added: 0,
    skipped: 0,
  });
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const result = parseCsv(content);

        if (result.errors.length > 0 && result.rows.length === 0) {
          toast.error(result.errors[0]);
          return;
        }

        setCsvData(result);

        // Auto-map columns that match field names or labels
        const autoMapping: Record<string, string> = {};
        const allFields = getLeadFieldsWithCustom(customFields);
        result.headers.forEach((header) => {
          const lower = header.toLowerCase().trim();
          for (const field of allFields) {
            const fieldKey = field.key.toLowerCase();
            const fieldLabel = field.label.toLowerCase();

            // Exact match on key or label (e.g. "firstname" === "firstName")
            if (lower === fieldKey || lower === fieldLabel) {
              autoMapping[field.key] = header;
              break;
            }

            // Custom field labels are "Name (type)" — match just the name part
            // e.g. "Niche" should match "Niche (select)"
            if (field.isCustom && fieldLabel.includes("(")) {
              const baseName = fieldLabel.split("(")[0].trim();
              if (lower === baseName) {
                autoMapping[field.key] = header;
                break;
              }
            }
          }
        });
        setColumnMapping(autoMapping);
        setStep("map");
      };
      reader.readAsText(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handlePreview = () => {
    if (!csvData) return;

    const leads: MappedLead[] = [];
    for (const row of csvData.rows) {
      const lead = mapCsvRowToLead(row, columnMapping, customFields);
      if (lead) leads.push(lead);
    }

    if (leads.length === 0) {
      toast.error("No valid leads found. Map at least First Name, Last Name, or Email.");
      return;
    }

    setMappedLeads(leads);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!mappedLeads.length) return;

    setStep("importing");
    const existingEmails = new Set(existingLeads.map((l) => l.email.toLowerCase()));

    const toImport: Omit<Lead, "id" | "createdAt" | "updatedAt">[] = [];
    let skipped = 0;

    for (const lead of mappedLeads) {
      if (lead.email && existingEmails.has(lead.email.toLowerCase())) {
        skipped++;
        continue;
      }

      toImport.push({
        workspaceId: "", // Will be set by caller
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        status: lead.status,
        source: lead.source,
        niche: lead.niche,
        value: lead.value,
        currency: lead.currency,
        website: lead.website,
        linkedin: lead.linkedin,
        country: lead.country,
        city: lead.city,
        tags: lead.tags,
        notes: lead.notes,
        assignedTo: null,
        customFields: lead.customFields,
        socialProfiles: {},
        avatarUrl: null,
        attachments: [],
        lastContactedAt: null,
        nextFollowUpAt: null,
        expectedCloseAt: null,
        createdBy: "", // Will be set by caller
      });
    }

    try {
      await onImport(toImport);
      setImportStats({ added: toImport.length - skipped, skipped });
      toast.success(`Imported ${toImport.length - skipped} leads (${skipped} duplicates skipped)`);
      setStep("upload");
      setCsvData(null);
      setColumnMapping({});
      setMappedLeads([]);
      onOpenChange(false);
    } catch {
      toast.error("Failed to import leads");
      setStep("preview");
    }
  };

  const handleExport = () => {
    const csv = leadsToCsv(existingLeads, customFields);
    downloadCsv(csv, `leads-export-${new Date().toISOString().split("T")[0]}`);
    toast.success("Leads exported successfully");
  };

  const handleClose = () => {
    setStep("upload");
    setCsvData(null);
    setColumnMapping({});
    setMappedLeads([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import leads. You can also export your existing leads.
          </DialogDescription>
        </DialogHeader>

        {/* Export Button */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Export Leads</p>
              <p className="text-xs text-muted-foreground">
                Download all {existingLeads.length} leads as CSV
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium">Drop your CSV file here</p>
            <p className="mb-4 text-sm text-muted-foreground">or click to browse</p>
            <Input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Label htmlFor="csv-upload">
              <Button asChild>
                <span>Choose File</span>
              </Button>
            </Label>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === "map" && csvData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Map CSV columns to Lead fields</h3>
              <Badge variant="secondary">{csvData.rows.length} rows detected</Badge>
            </div>

            {csvData.errors.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {csvData.errors.length} parsing error(s)
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {csvData.errors.slice(0, 3).join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {getLeadFieldsWithCustom(customFields).map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-24 text-sm flex items-center gap-1">
                    {field.label}
                    {field.isCustom && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        Custom
                      </Badge>
                    )}
                  </Label>
                  <Select
                    value={columnMapping[field.key] || ""}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: v }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Don't import" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Don&apos;t import</SelectItem>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handlePreview}>Preview Import</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Preview: {mappedLeads.length} leads will be imported
              </h3>
              <Badge variant="secondary">
                {mappedLeads.filter((l) => l.email).length} with email
              </Badge>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Company</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedLeads.slice(0, 10).map((lead, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="px-3 py-2">{lead.email}</td>
                      <td className="px-3 py-2">{lead.company || "—"}</td>
                      <td className="px-3 py-2">
                        {lead.value ? `$${lead.value.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappedLeads.length > 10 && (
              <p className="text-xs text-muted-foreground">
                Showing 10 of {mappedLeads.length} leads
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {mappedLeads.length} Leads
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Importing leads...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
