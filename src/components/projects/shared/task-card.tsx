"use client";

import type { ProjectTask } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20",
  medium: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20",
  low: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: ProjectTask;
  /** Map of userId -> displayName for rendering assignee */
  memberMap?: Map<string, { displayName: string; photoURL?: string | null }>;
  /** Called when completing/incompleting a task */
  onToggleComplete?: (task: ProjectTask) => void;
  /** Called to open task detail/edit */
  onClick?: (task: ProjectTask) => void;
  /** Called to delete the task */
  onDelete?: (task: ProjectTask) => void;
  /** Whether subtasks are shown */
  showSubtasks?: boolean;
  /** Toggle subtask expansion */
  onToggleSubtasks?: (task: ProjectTask) => void;
  /** Whether this is a subtask card (different indentation) */
  isSubtask?: boolean;
  /** Loading state for this task */
  saving?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({
  task,
  memberMap,
  onToggleComplete,
  onClick,
  onDelete,
  showSubtasks,
  onToggleSubtasks,
  isSubtask,
  saving,
  className,
}: TaskCardProps) {
  const isComplete = task.status.parent === "Complete";

  // The status object uses parent + name; if parent is complete, use complete color
  const statusBg = isComplete ? "#E8F5E9" : task.status.color || "#F5EFCF";
  const statusLabel = task.status.name || task.status.parent;

  const assignee = task.assigneeId ? memberMap?.get(task.assigneeId) : null;
  const hasSubtasks = task.hasSubtasks && !isSubtask;

  const dueDateValue =
    task.dueDate && typeof (task.dueDate as any).toDate === "function"
      ? (task.dueDate as any).toDate()
      : task.dueDate
        ? new Date(task.dueDate as unknown as string)
        : null;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50",
        isComplete && "opacity-70",
        isSubtask && "ml-8 border-dashed",
        saving && "pointer-events-none opacity-60",
        className
      )}
    >
      {/* Drag handle (visual only for now) */}
      {!isSubtask && (
        <button
          className="mt-0.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground shrink-0"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Completion checkbox */}
      <Checkbox
        checked={isComplete}
        onCheckedChange={() => onToggleComplete?.(task)}
        className="mt-0.5 shrink-0"
        aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
      />

      {/* Main content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onClick?.(task)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(task);
          }
        }}
      >
        {/* Title + Status badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium leading-tight",
              isComplete && "line-through text-muted-foreground"
            )}
          >
            {task.taskName}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: statusBg, color: "#374151" }}
          >
            {statusLabel}
          </span>
          {task.priority && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORITY_COLORS[task.priority]
              )}
            >
              {task.priority}
            </span>
          )}
        </div>

        {/* Due date + Assignee row */}
        <div className="flex items-center gap-3 mt-1.5">
          {dueDateValue && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                isComplete
                  ? "text-muted-foreground"
                  : dueDateValue < new Date()
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(dueDateValue)}
              {dueDateValue < new Date() && !isComplete && " (overdue)"}
            </span>
          )}

          {assignee && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {assignee.photoURL ? (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={assignee.photoURL} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(assignee.displayName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-3 w-3" />
              )}
              {assignee.displayName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Subtask toggle */}
        {hasSubtasks && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onToggleSubtasks?.(task)}
            aria-label={showSubtasks ? "Hide subtasks" : "Show subtasks"}
          >
            {showSubtasks ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Task actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onClick?.(task)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(task)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
