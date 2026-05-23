"use client";

import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ColumnReorderItemProps {
  id: string;
  label: string;
  isCustom?: boolean;
  isVisible: boolean;
  isLast: boolean;
  onToggleVisibility: () => void;
  onMoveDown: () => void;
}

export function ColumnReorderItem({
  id,
  label,
  isCustom,
  isVisible,
  isLast,
  onToggleVisibility,
  onMoveDown,
}: ColumnReorderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md",
        isDragging ? "z-50 bg-muted shadow-sm" : "hover:bg-muted/50"
      )}
      {...attributes}
    >
      {/* Drag handle */}
      <button
        type="button"
        disabled={isLast}
        className={cn(
          "h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing touch-none",
          isLast && "opacity-20 cursor-not-allowed"
        )}
        {...listeners}
        onClick={(e) => {
          // Click fallback: move down one position
          if (!isLast) {
            e.stopPropagation();
            onMoveDown();
          }
        }}
        tabIndex={-1}
        title={isLast ? "Already at end" : "Drag to reorder, or click to move right"}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Visibility toggle */}
      <div
        className="flex items-center gap-2 flex-1 cursor-pointer py-0.5 min-w-0"
        onClick={onToggleVisibility}
      >
        <Checkbox
          checked={isVisible}
          className="pointer-events-none flex-shrink-0"
        />
        <span className="text-sm truncate">{label}</span>
        {isCustom && (
          <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Custom
          </span>
        )}
      </div>
    </div>
  );
}
