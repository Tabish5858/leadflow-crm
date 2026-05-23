"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_PREFIX = "leadflow_col_width_";

/**
 * Hook for resizable table columns.
 *
 * Stores widths in localStorage under `leadflow_col_width_<tableId>`.
 * Returns a `startResize` handler to attach to drag handles, and the
 * current `columnWidths` map to apply as inline `width` / `minWidth`.
 */
export function useColumnResize(tableId: string) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + tableId);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const resizeRef = useRef<{
    colId: string;
    startX: number;
    startWidth: number;
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: () => void;
  } | null>(null);

  const startResize = useCallback(
    (colId: string, headerElement: HTMLElement, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = headerElement.offsetWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = ev.clientX - resizeRef.current.startX;
        const newWidth = Math.max(72, resizeRef.current.startWidth + diff);
        setColumnWidths((prev) => ({ ...prev, [colId]: newWidth }));
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.body.style.pointerEvents = "";
      };

      resizeRef.current = { colId, startX, startWidth, handleMouseMove, handleMouseUp };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (resizeRef.current) {
        document.removeEventListener("mousemove", resizeRef.current.handleMouseMove);
        document.removeEventListener("mouseup", resizeRef.current.handleMouseUp);
      }
    };
  }, []);

  // Persist to localStorage when widths change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(columnWidths));
    } catch {
      /* storage full — ignore */
    }
  }, [columnWidths, tableId]);

  return { columnWidths, startResize } as const;
}
