"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResizableHeaderProps {
  /** Unique column id used as key in the column-widths map. */
  colId: string;
  /** Current pixel width for this column (from useColumnResize). */
  width: number | undefined;
  /** Callback to start a resize drag. Receives the header element for DOM measurements. */
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
 * A `<th>` element with a drag handle on the right edge.
 *
 * Usage inside a `<thead>`:
 * ```tsx
 * <ResizableHeader colId="name" width={columnWidths.name} onResizeStart={startResize}>
 *   Name
 * </ResizableHeader>
 * ```
 */
export function ResizableHeader({
  colId,
  width,
  onResizeStart,
  className,
  style,
  children,
  minWidth = 72,
}: ResizableHeaderProps) {
  const thRef = useRef<HTMLTableCellElement>(null);

  return (
    <th
      ref={thRef}
      className={cn("relative group", className)}
      style={{
        width: width ?? undefined,
        minWidth: width ?? minWidth,
        ...style,
      }}
    >
      {children}
      {/* Drag handle - visible on hover */}
      <div
        className="absolute right-0 top-1 bottom-1 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => onResizeStart(colId, thRef.current!, e)}
      />
    </th>
  );
}
