"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardCardId } from "@/types/dashboard";

interface DashboardCardProps {
  id: DashboardCardId;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Show a small loading indicator inside the header */
  loading?: boolean;
  /** Action element shown in header (e.g. "View All" link) */
  headerAction?: React.ReactNode;
}

export function DashboardCard({
  id,
  title,
  description,
  children,
  className,
  loading,
  headerAction,
}: DashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-40")}
    >
      <Card
        className={cn(
          "group relative flex h-[350px] sm:h-[400px] flex-col border-border/60",
          "transition-shadow hover:shadow-md",
          className
        )}
      >
        {/* Drag handle — visible on hover */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "absolute right-2 top-2 z-10 rounded-md p-1",
            "text-muted-foreground/40 hover:text-muted-foreground",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "cursor-grab active:cursor-grabbing"
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight truncate">
                {title}
              </h3>
              {loading && (
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-muted-foreground/30" />
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0 ml-3">{headerAction}</div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton placeholder for a dashboard card */
export function DashboardCardSkeleton() {
  return (
    <Card className="h-[350px] sm:h-[400px] animate-pulse">
      <CardHeader className="pb-3 pt-5">
        <div className="h-5 w-1/3 rounded bg-muted" />
        <div className="mt-1 h-3 w-1/2 rounded bg-muted/60" />
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-3/4 rounded bg-muted/40" />
        <div className="h-4 w-5/6 rounded bg-muted/40" />
        <div className="h-4 w-2/3 rounded bg-muted/40" />
      </CardContent>
    </Card>
  );
}
