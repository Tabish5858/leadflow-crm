/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { ProjectTask } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "recharts";

const STATUS_OPTIONS = [
  { parent: "To Do" as const, name: "Not Started", color: "#DDDDDD" },
  { parent: "In Progress" as const, name: "In Progress", color: "#CFE6F5" },
  { parent: "Complete" as const, name: "Complete", color: "#D1F5CF" },
  { parent: "On Hold" as const, name: "On Hold", color: "#FFE0B2" },
];

const COLOR_MAPPING: Record<string, string> = {
  "#DDDDDD": "#5B5B5B",
  "#CFE6F5": "#003180",
  "#D1F5CF": "#008000",
  "#FFE0B2": "#803A00",
};

function getStatusStyle(color: string) {
  const upper = color.toUpperCase();
  if (COLOR_MAPPING[upper]) return { backgroundColor: color, color: COLOR_MAPPING[upper] };
  return { backgroundColor: color, color: "#374151" };
}

function parseDueDate(dueDate: unknown): Date | null {
  if (!dueDate) return null;
  if (typeof (dueDate as any).toDate === "function") return (dueDate as any).toDate();
  if (typeof dueDate === "object" && "seconds" in (dueDate as any)) return new Date((dueDate as any).seconds * 1000);
  if (typeof dueDate === "string") { const d = new Date(dueDate); return isNaN(d.getTime()) ? null : d; }
  if (dueDate instanceof Date) return dueDate;
  return null;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

function TitleEdit({
  title, isEditing, onStartEdit, onSubmit, onCancel,
}: {
  title: string; isEditing: boolean; onStartEdit: () => void; onSubmit: (newTitle: string) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setVal(title); }, [title]);
  useEffect(() => { if (isEditing && ref.current) { ref.current.focus(); ref.current.select(); } }, [isEditing]);
  useEffect(() => {
    if (!isEditing) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (val.trim() !== title.trim()) onSubmit(val.trim());
        else onCancel();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isEditing, val, title, onSubmit, onCancel]);
  if (isEditing) {
    return (
      <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSubmit(val.trim()); if (e.key === "Escape") onCancel(); }}
        className="w-full px-1.5 py-0.5 text-sm border border-foreground/20 rounded focus:outline-none font-medium bg-background text-foreground"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
      className="cursor-pointer hover:bg-accent px-1.5 py-0.5 -ml-1.5 rounded text-sm font-medium text-foreground truncate"
    >{title}</span>
  );
}

interface TaskCardProps {
  task: ProjectTask;
  memberMap?: Map<string, { displayName: string; photoURL?: string | null }>;
  onToggleComplete?: (task: ProjectTask) => void;
  onStatusChange?: (task: ProjectTask, newStatus: { parent: string; name: string; color: string }) => void;
  onTitleChange?: (task: ProjectTask, newTitle: string) => void;
  onDelete?: (task: ProjectTask) => void;
  onAssigneeChange?: (task: ProjectTask, assigneeId: string | null) => void;
  onDueDateChange?: (task: ProjectTask, dueDate: Date | null) => void;
  members?: Array<{ userId: string; displayName: string; email: string }>;
  showSubtasks?: boolean;
  onToggleSubtasks?: (task: ProjectTask) => void;
  isSubtask?: boolean;
  onDragStart?: (e: React.DragEvent, task: ProjectTask) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, task: ProjectTask) => void;
  isDragging?: boolean;
  saving?: boolean;
  className?: string;
}

export function TaskCard({
  task, memberMap, onToggleComplete, onStatusChange, onTitleChange, onDelete,
  onAssigneeChange, onDueDateChange, members = [],
  showSubtasks, onToggleSubtasks, isSubtask,
  onDragStart, onDragEnd, onDragOver, onDrop,
  isDragging, saving, className,
}: TaskCardProps) {
  const isComplete = task.status.parent === "Complete";
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const statusStyle = getStatusStyle(task.status.color || "#DDDDDD");

  const assignee = task.assigneeId ? memberMap?.get(task.assigneeId) : null;
  const hasSubtasks = task.hasSubtasks && !isSubtask;
  const dueDateValue = parseDueDate(task.dueDate);
  const isRealSubtask = !!task.parentTaskId;

  const handleDragStart = (e: React.DragEvent) => { onDragStart?.(e, task); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); onDragOver?.(e); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); onDrop?.(e, task); };

  return (
    <div className={cn("workflow-item relative group", isSubtask && "ml-8", isDragging && "opacity-30", className)}>
      <div className={cn("transition-colors", !isSubtask && "border border-border rounded-md p-2 bg-card hover:bg-accent/30")}>
        <div
          draggable={!!onDragStart && !isSubtask}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex items-start pt-0.5"
        >
          <div className="flex-1 min-w-0">
            <div className="transition-all">
              <div className="flex items-center justify-between gap-2">
                {/* LEFT SIDE */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Drag handle */}
                  {!isSubtask && onDragStart && (
                    <div className="text-muted-foreground/30 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}
                  {/* Status icon */}
                  <button onClick={() => onToggleComplete?.(task)} className="shrink-0 hover:opacity-80" title={isComplete ? "Mark incomplete" : "Mark complete"}>
                    {isComplete ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="1" y="1" width="18" height="18" rx="9" className="fill-foreground" />
                        <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" className="text-border" fill="transparent" />
                      </svg>
                    )}
                  </button>



                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TitleEdit title={task.taskName} isEditing={isEditingTitle}
                        onStartEdit={() => setIsEditingTitle(true)}
                        onSubmit={(t) => { setIsEditingTitle(false); if (t !== task.taskName) onTitleChange?.(task, t); }}
                        onCancel={() => setIsEditingTitle(false)}
                      />
                      {hasSubtasks && (
                        <button onClick={() => onToggleSubtasks?.(task)} className="shrink-0 p-0.5 hover:bg-accent rounded">
                          {showSubtasks ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Assignee + Due date inline */}
                  {!isRealSubtask && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {/* Assignee */}
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowAssigneeDropdown(!showAssigneeDropdown); }}
                          className="flex items-center justify-center w-5 h-5 rounded-full bg-muted hover:bg-accent transition-colors shrink-0"
                          title={assignee ? assignee.displayName : "Assign"}
                        >
                          {assignee ? (
                            <span className="text-[9px] font-medium text-foreground">{getInitials(assignee.displayName)}</span>
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        {showAssigneeDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAssigneeDropdown(false)} />
                            <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] max-h-[200px] overflow-y-auto">
                              <button onClick={() => { setShowAssigneeDropdown(false); onAssigneeChange?.(task, null); }}
                                className={cn("w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent text-foreground", !task.assigneeId && "font-semibold")}
                              >
                                <div className="w-4 h-4 rounded-full bg-muted shrink-0" /> Unassigned
                              </button>
                              {members.map((m) => (
                                <button key={m.userId} onClick={() => { setShowAssigneeDropdown(false); onAssigneeChange?.(task, m.userId); }}
                                  className={cn("w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent text-foreground", task.assigneeId === m.userId && "font-semibold")}
                                >
                                  <div className="w-4 h-4 bg-muted rounded-full flex items-center justify-center text-[8px] font-medium shrink-0">{getInitials(m.displayName)}</div>
                                  {m.displayName}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Due date */}
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowDueDatePicker(!showDueDatePicker); }}
                          className={cn("flex items-center gap-0.5 hover:bg-accent rounded px-1 py-0.5 transition-colors", dueDateValue && dueDateValue < new Date() && !isComplete ? "text-destructive" : "text-muted-foreground")}
                          title={dueDateValue ? `Due ${formatDate(dueDateValue)}` : "Set due date"}
                        >
                          <Calendar className="h-3 w-3" />
                          {dueDateValue && <span className="text-[11px] whitespace-nowrap">{formatDate(dueDateValue)}</span>}
                        </button>
                        {showDueDatePicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDueDatePicker(false)} />
                            <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3">
                              <input type="date"
                                className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground"
                                value={dueDateValue ? dueDateValue.toISOString().split("T")[0] : ""}
                                onChange={(e) => { const v = e.target.value; onDueDateChange?.(task, v ? new Date(v + "T00:00:00") : null); setShowDueDatePicker(false); }}
                                autoFocus
                              />
                              {dueDateValue && (
                                <button onClick={() => { onDueDateChange?.(task, null); setShowDueDatePicker(false); }}
                                  className="w-full text-left mt-1.5 px-2 py-1 text-[10px] text-destructive hover:bg-accent rounded"
                                >Clear date</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {task.createdAt && !isSubtask && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                      {task.createdAt.toDate ? new Date(task.createdAt.toDate()).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                    </span>
                  )}
                  {/* Status */}
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={statusStyle}
                    >
                      {task.status.name || task.status.parent}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showStatusDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1.5 min-w-[150px]">
                          <div className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">Change Status</div>
                          {STATUS_OPTIONS.map((opt) => (
                            <button key={opt.name} onClick={() => { setShowStatusDropdown(false); onStatusChange?.(task, opt); }}
                              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                              <span className={cn("text-foreground", opt.name === task.status.name && "font-semibold")}>{opt.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* 3-dot menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all shrink-0">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setIsEditingTitle(true)} className="text-foreground">
                        <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(task)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
