"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { Label } from "@/components/ui/label";
import {
  updateSpreadsheetSnapshot,
  updateSpreadsheetName,
} from "@/lib/firebase/spreadsheets";
import { Upload, Loader2, Save } from "lucide-react";
import type { IWorkbookData } from "@univerjs/core";

interface SpreadsheetEditorProps {
  workspaceId: string;
  spreadsheetId: string;
  initialName: string;
  initialSnapshot: IWorkbookData | null;
}

export function SpreadsheetEditor({
  workspaceId,
  spreadsheetId,
  initialName,
  initialSnapshot,
}: SpreadsheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const univerRef = useRef<{
    univerAPI: any;
    getSnapshot: () => IWorkbookData;
    dispose: () => void;
  } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<IWorkbookData | null>(null);

  // Debounced save to Firestore
  const debouncedSave = useCallback(
    (snapshot: IWorkbookData) => {
      pendingSnapshotRef.current = snapshot;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!pendingSnapshotRef.current) return;
        setSaving(true);
        try {
          await updateSpreadsheetSnapshot(
            workspaceId,
            spreadsheetId,
            pendingSnapshotRef.current
          );
          pendingSnapshotRef.current = null;
        } catch {
          toast.error("Failed to auto-save spreadsheet");
        } finally {
          setSaving(false);
        }
      }, 2000);
    },
    [workspaceId, spreadsheetId]
  );

  // Initialize Univer
  useEffect(() => {
    let disposed = false;

    async function init() {
      // Dynamic import to avoid SSR issues
      const [
        { UniverSheetsCorePreset },
        UniverPresetSheetsCoreEnUS,
        { createUniver, LocaleType, mergeLocales },
      ] = await Promise.all([
        import("@univerjs/preset-sheets-core"),
        import("@univerjs/preset-sheets-core/locales/en-US"),
        import("@univerjs/presets"),
      ]);

      // Import CSS
      await import("@univerjs/preset-sheets-core/lib/index.css");

      if (disposed || !containerRef.current) return;

      const container = containerRef.current;

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(
            UniverPresetSheetsCoreEnUS as Record<string, any>
          ),
        },
        presets: [
          UniverSheetsCorePreset({
            container,
          }),
        ],
      });

      if (disposed) {
        univerAPI.disposeUnit("");
        return;
      }

      // Create workbook with existing snapshot or empty
      const workbook = initialSnapshot
        ? univerAPI.createWorkbook(initialSnapshot as any)
        : univerAPI.createWorkbook({});

      // Set up auto-save on any command
      const disposable = univerAPI.onCommandExecuted(() => {
        try {
          const snapshot = workbook.getSnapshot() as unknown as IWorkbookData;
          debouncedSave(snapshot);
        } catch {
          // Snapshot might not be ready
        }
      });

      univerRef.current = {
        univerAPI,
        getSnapshot: () => workbook.getSnapshot() as unknown as IWorkbookData,
        dispose: () => {
          disposable.dispose();
          univerAPI.disposeUnit(workbook.getId());
        },
      };

      setInitialized(true);
    }

    init();

    return () => {
      disposed = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  const handleNameChange = async (newName: string) => {
    setName(newName);
    try {
      await updateSpreadsheetName(workspaceId, spreadsheetId, newName);
    } catch {
      toast.error("Failed to rename spreadsheet");
    }
  };

  // ─── CSV Import ──────────────────────────────────────────────────────────
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (inQuotes) {
        if (char === '"' && next === '"') { current += '"'; i++; }
        else if (char === '"') { inQuotes = false; }
        else { current += char; }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === ",") { result.push(current.trim()); current = ""; }
        else { current += char; }
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!univerRef.current) { toast.error("Editor not ready"); return; }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV is empty"); return; }

      const headers = parseCSVLine(lines[0]);
      const data: string[][] = [headers];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        while (values.length > headers.length && values[values.length - 1] === "") {
          values.pop();
        }
        data.push(values.slice(0, headers.length));
      }

      // Insert into the active sheet
      const { univerAPI } = univerRef.current;
      const sheet = univerAPI.getActiveWorkbook().getActiveSheet();
      const range = sheet.getRange(0, 0, data.length, data[0].length);
      range.setValues(data);

      toast.success(`Imported ${data.length - 1} rows`);
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setImporting(false);
      // Reset file input so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSave = async () => {
    if (!univerRef.current) return;
    setSaving(true);
    try {
      const snapshot = univerRef.current.getSnapshot();
      await updateSpreadsheetSnapshot(workspaceId, spreadsheetId, snapshot);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-8 w-64 text-sm font-medium border-none px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:rounded-none"
          />
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualSave}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Univer container */}
      {!initialized && (
        <div className="rounded-lg border">
          <Skeleton className="h-[70vh] w-full rounded-lg" />
        </div>
      )}
      <div
        ref={containerRef}
        className="rounded-lg border overflow-hidden"
        style={{ height: "70vh", display: initialized ? "block" : "none" }}
      />
    </div>
  );
}
