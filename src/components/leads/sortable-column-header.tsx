"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SortableColumnHeaderProps {
  /** Unique column id used as key for the column-widths map. */
  colId: string;
  /** Current pixel width for this column (from useColumnResize). */
  width: number | undefined;
  /** Callback to start a resize drag. */
  onResizeStart: (colId: string, headerElement: HTMLElement, e: React.MouseEvent) => void;
  /** Additional classes for the <th>. */
  className?: string;
  /** Inline styles for the <th>. */
  style?: React.CSSProperties;
  children: ReactNode;
  /** Optional: minimum width in px. Defaults to 72. */
  minWidth?: number;
}

/**
 * A `<th>` element with a hover-visible resize handle on the right edge.
 * Column reordering is done from the toggle-columns dropdown instead of header drag.
 */
export function SortableColumnHeader({
  colId,
  width,
  onResizeStart,
  className,
  style: customStyle,
  children,
  minWidth = 72,
}: SortableColumnHeaderProps) {
  const thRef = useRef<HTMLTableCellElement>(null);

  return (
    <th
      ref={thRef}
      className={cn("relative group", className)}
      style={{
        width: width ?? undefined,
        minWidth: width ?? minWidth,
        ...customStyle,
      }}
    >
      {children}
      {/* Resize handle — right edge, visible on hover */}
      <div
        className="absolute right-0 top-1 bottom-1 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => onResizeStart(colId, thRef.current!, e)}
      />
    </th>
  );
}
