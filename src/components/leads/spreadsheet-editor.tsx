"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  updateSpreadsheetSnapshot,
  updateSpreadsheetName,
} from "@/lib/firebase/spreadsheets";
import { Upload, Loader2, Save } from "lucide-react";
import type { IWorkbookData } from "@univerjs/core";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UniverAPI = any;

const SAVE_DEBOUNCE_MS = 2000;
const MAX_SAVE_INTERVAL_MS = 10000;
const MAX_CSV_ROWS = 5000;
const SNAPSHOT_SIZE_WARN_BYTES = 900_000;

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
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const univerRef = useRef<{
    univerAPI: UniverAPI;
    dispose: () => void;
  } | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced save to Firestore (only calls getSnapshot() once at save time) ─
  const triggerSave = useCallback(() => {
    if (!univerRef.current) return;
    if (!dirtyRef.current) return;

    // Clear pending timers
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (!univerRef.current || !dirtyRef.current) return;
      dirtyRef.current = false;

      setSaving(true);
      try {
        const { univerAPI } = univerRef.current;
        const workbook = univerAPI.getActiveWorkbook();
        const snapshot = workbook.getSnapshot() as unknown as IWorkbookData;

        // Size check — warn if approaching Firestore 1MB limit
        const size = new Blob([JSON.stringify(snapshot)]).size;
        if (size > SNAPSHOT_SIZE_WARN_BYTES) {
          console.warn(`Spreadsheet snapshot is ${(size / 1024).toFixed(0)}KB — approaching Firestore 1MB limit`);
        }

        await updateSpreadsheetSnapshot(workspaceId, spreadsheetId, snapshot);
      } catch {
        toast.error("Failed to auto-save spreadsheet");
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);

    // Force save after MAX_SAVE_INTERVAL_MS even if user keeps editing
    maxTimerRef.current = setTimeout(async () => {
      if (!univerRef.current || !dirtyRef.current) return;
      dirtyRef.current = false;

      setSaving(true);
      try {
        const { univerAPI } = univerRef.current;
        const workbook = univerAPI.getActiveWorkbook();
        const snapshot = workbook.getSnapshot() as unknown as IWorkbookData;
        await updateSpreadsheetSnapshot(workspaceId, spreadsheetId, snapshot);
      } catch {
        // silent — user will see next save attempt
      } finally {
        setSaving(false);
      }
    }, MAX_SAVE_INTERVAL_MS);
  }, [workspaceId, spreadsheetId]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    triggerSave();
  }, [triggerSave]);

  // ─── Warn on unsaved changes before unload ───────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ─── Initialize Univer ──────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;

    async function init() {
      const [
        { UniverSheetsCorePreset },
        UniverPresetSheetsCoreEnUS,
        { createUniver, LocaleType, mergeLocales },
      ] = await Promise.all([
        import("@univerjs/preset-sheets-core"),
        import("@univerjs/preset-sheets-core/locales/en-US"),
        import("@univerjs/presets"),
      ]);

      await import("@univerjs/preset-sheets-core/lib/index.css");

      if (disposed || !containerRef.current) return;

      const container = containerRef.current;

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            UniverPresetSheetsCoreEnUS as any
          ),
        },
        presets: [
          UniverSheetsCorePreset({ container }),
        ],
      });

      if (disposed) {
        univerAPI.disposeUnit("");
        return;
      }

      // Create workbook with existing snapshot or empty
      const workbook = initialSnapshot
        ? univerAPI.createWorkbook(initialSnapshot)
        : univerAPI.createWorkbook({});

      // Sync theme on init
      const isDark = document.documentElement.classList.contains("dark");
      univerAPI.toggleDarkMode(isDark);

      // Mark dirty on any command (lightweight — no snapshot taken)
      const disposable = univerAPI.onCommandExecuted(() => {
        markDirty();
      });

      univerRef.current = { univerAPI, dispose: () => {
        disposable.dispose();
        univerAPI.disposeUnit(workbook.getId());
      }};

      setInitialized(true);
    }

    init();

    return () => {
      disposed = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
      }
    };
  }, []); // Only run once on mount — no deps needed since initialSnapshot is loaded once

  // ─── Sync Univer theme with app theme ───────────────────────────────────
  useEffect(() => {
    if (!univerRef.current) return;
    // Debounce theme sync to avoid rapid toggles during init
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (!univerRef.current) return;
      const isDark = theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      univerRef.current.univerAPI.toggleDarkMode(isDark);
    }, 100);
  }, [theme]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleNameChange = async (newName: string) => {
    setName(newName);
    try {
      await updateSpreadsheetName(workspaceId, spreadsheetId, newName);
    } catch {
      toast.error("Failed to rename spreadsheet");
    }
  };

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
      if (lines.length > MAX_CSV_ROWS) {
        toast.error(`CSV too large (max ${MAX_CSV_ROWS.toLocaleString()} rows)`);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      // Sanitize: limit column count to prevent abuse
      if (headers.length > 100) {
        toast.error("CSV has too many columns (max 100)");
        return;
      }

      const data: string[][] = [headers];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        while (values.length > headers.length && values[values.length - 1] === "") {
          values.pop();
        }
        // Truncate extra values, pad missing ones
        const row = values.slice(0, headers.length);
        while (row.length < headers.length) row.push("");
        data.push(row);
      }

      const { univerAPI } = univerRef.current;
      const sheet = univerAPI.getActiveWorkbook().getActiveSheet();
      const range = sheet.getRange(0, 0, data.length, data[0].length);
      range.setValues(data);

      toast.success(`Imported ${data.length - 1} rows`);
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSave = async () => {
    if (!univerRef.current) return;
    dirtyRef.current = false;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);

    setSaving(true);
    try {
      const { univerAPI } = univerRef.current;
      const workbook = univerAPI.getActiveWorkbook();
      const snapshot = workbook.getSnapshot() as unknown as IWorkbookData;
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
            <span className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in">
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
