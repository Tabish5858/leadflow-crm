"use client";

import { useState, useRef, useEffect } from "react";
import type { ProjectTask, ProjectMilestone, WorkspaceMember } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCard } from "@/components/projects/shared/task-card";
import {
  Plus,
  List,
  Columns,
  Diamond,
  GripVertical,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Section Action Button ────────────────────────────────────────────────────

function SectionActionButton({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!secondaryLabel) {
    return (
      <button onClick={onPrimary}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" /> {primaryLabel}
      </button>
    );
  }

  return (
    <div className="relative flex items-center">
      <button onClick={onPrimary}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-l-md hover:bg-primary/90 transition-colors border-r border-primary-foreground/20"
      >
        <Plus className="h-4 w-4" /> {primaryLabel}
      </button>
      <button onClick={() => setOpen(!open)}
        className="px-2 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors"
      >
        <svg className={cn("h-4 w-4 transition-transform", open && "rotate-180")} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border border-border rounded-lg shadow-lg py-1">
          <button onClick={() => { setOpen(false); onSecondary?.(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent flex items-center gap-3 transition-colors"
          >
            <Diamond className="h-4 w-4" />
            <span>Add {secondaryLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline Task Creator ──────────────────────────────────────────────────────

function InlineTaskCreator({
  title,
  onTitleChange,
  onCreate,
  onCancel,
  placeholder = "Type task title and press Enter...",
  pillLabel = "task",
}: {
  title: string;
  onTitleChange: (val: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  placeholder?: string;
  pillLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.focus();
  }, []);

  return (
    <div className="workflow-item-container relative border border-foreground/20 rounded-md p-2 bg-card">
      <div className="flex items-center gap-3 py-0.5 justify-between">
        <div className="flex-1">
          <input
            ref={ref}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) onCreate();
              else if (e.key === "Escape") onCancel();
            }}
            onBlur={() => { if (!title.trim()) onCancel(); }}
            placeholder={placeholder}
            className="w-full p-0 px-2 focus:outline-none focus:ring-0 focus:shadow-none font-medium bg-transparent text-foreground text-sm"
          />
        </div>
        <span className="bg-muted text-foreground rounded-full px-3 py-1 leading-none text-xs">{pillLabel}</span>
      </div>
    </div>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

function BoardView({
  tasks,
  milestones,
  memberMap,
  onToggleTaskComplete,
  onTaskStatusChange,
  onDeleteTask,
  onTitleChange,
}: {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  memberMap: Map<string, { displayName: string; photoURL?: string | null }>;
  onToggleTaskComplete: (task: ProjectTask) => void;
  onTaskStatusChange: (task: ProjectTask, newStatus: { parent: string; name: string; color: string }) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onTitleChange?: (task: ProjectTask, newTitle: string) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const columns = [
    { key: "To Do", label: "Not Started", color: "#DDDDDD" },
    { key: "In Progress", label: "In Progress", color: "#CFE6F5" },
    { key: "Complete", label: "Complete", color: "#D1F5CF" },
    { key: "On Hold", label: "On Hold", color: "#FFE0B2" },
  ];

  const handleDragStart = (e: React.DragEvent, task: ProjectTask) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id, fromStatus: task.status.parent }));
  };

  const handleColumnDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDragOverCol(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.fromStatus === targetCol) return;
      const newStatus =
        targetCol === "To Do" ? { parent: "To Do" as const, name: "Not Started", color: "#DDDDDD" } :
        targetCol === "In Progress" ? { parent: "In Progress" as const, name: "In Progress", color: "#CFE6F5" } :
        targetCol === "Complete" ? { parent: "Complete" as const, name: "Complete", color: "#D1F5CF" } :
        { parent: "On Hold" as const, name: "On Hold", color: "#FFE0B2" };
      const task = tasks.find((t) => t.id === data.id);
      if (task) onTaskStatusChange(task, newStatus);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status.parent === col.key);
        const isCompleteCol = col.key === "Complete";
        const isOver = dragOverCol === col.key;
        return (
          <div key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOverCol(null); }}
            onDrop={(e) => handleColumnDrop(e, col.key)}
            className={cn("rounded-lg border min-h-[200px] transition-colors",
              isOver ? "border-foreground/40 bg-accent/30" : "border-border bg-muted/30"
            )}
          >
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div className="p-2 space-y-2">
              {colTasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[11px] text-muted-foreground/60">No tasks</p>
                </div>
              ) : (
                colTasks.map((task) => (
                  <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)}
                    className="bg-card rounded-md border border-border p-2.5 shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <button onClick={() => onToggleTaskComplete(task)} className="mt-0.5 shrink-0">
                        {isCompleteCol ? (
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <rect x="1" y="1" width="18" height="18" rx="9" className="fill-foreground" />
                            <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" className="text-border" fill="transparent" />
                          </svg>
                        )}
                      </button>
                      <span className="text-xs font-medium text-foreground line-clamp-2">
                        {task.taskName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.dueDate && (() => {
                        const d = typeof (task.dueDate as any).toDate === "function" ? (task.dueDate as any).toDate() : new Date(task.dueDate as any);
                        return (
                          <span className="text-[10px] text-muted-foreground">
                            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        );
                      })()}
                      {task.assigneeId && memberMap.has(task.assigneeId) && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {memberMap.get(task.assigneeId)?.displayName?.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WorkflowSection Component ─────────────────────────────────────────────────

interface WorkflowSectionProps {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  memberMap: Map<string, { displayName: string; photoURL?: string | null }>;
  onToggleTaskComplete: (task: ProjectTask) => void;
  onTaskStatusChange: (task: ProjectTask, newStatus: { parent: string; name: string; color: string }) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onTitleChange?: (task: ProjectTask, newTitle: string) => void;
  onAddTask: () => void;
  onAddMilestone: () => void;
  getSubtasks: (parentId: string) => ProjectTask[];
  expandedTasks: Set<string>;
  onToggleSubtaskExpand: (task: ProjectTask) => void;
  onTaskDragStart?: (e: React.DragEvent, task: ProjectTask) => void;
  onTaskDrop?: (e: React.DragEvent, targetTask: ProjectTask) => void;
  isCreatingTask?: boolean;
  newTaskTitle?: string;
  onNewTaskTitleChange?: (val: string) => void;
  onCreateTask?: () => void;
  onCancelCreateTask?: () => void;
  isCreatingNestedTask?: boolean;
  nestedMilestoneId?: string | null;
  newNestedTaskTitle?: string;
  onNewNestedTaskTitleChange?: (val: string) => void;
  onCreateNestedTask?: () => void;
  onCancelCreateNestedTask?: () => void;
  onAddNestedTask?: (milestoneId: string) => void;
  onMilestoneDragStart?: (e: React.DragEvent, milestone: ProjectMilestone) => void;
  onMilestoneDrop?: (e: React.DragEvent, targetMilestone: ProjectMilestone) => void;
  milestoneTaskMap?: Map<string, ProjectTask[]>;
  expandedMilestones?: Set<string>;
  onToggleMilestoneExpand?: (milestoneId: string) => void;
}

export default function WorkflowSection({
  tasks,
  milestones,
  memberMap,
  onToggleTaskComplete,
  onTaskStatusChange,
  onDeleteTask,
  onTitleChange,
  onAddTask,
  onAddMilestone,
  getSubtasks,
  expandedTasks,
  onToggleSubtaskExpand,
  onTaskDragStart,
  onTaskDrop,
  isCreatingTask,
  newTaskTitle = "",
  onNewTaskTitleChange,
  onCreateTask,
  onCancelCreateTask,
  isCreatingNestedTask,
  nestedMilestoneId,
  newNestedTaskTitle = "",
  onNewNestedTaskTitleChange,
  onCreateNestedTask,
  onCancelCreateNestedTask,
  onAddNestedTask,
  onMilestoneDragStart,
  onMilestoneDrop,
  milestoneTaskMap,
  expandedMilestones,
  onToggleMilestoneExpand,
}: WorkflowSectionProps) {
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const topLevelTasks = tasks.filter((t) => !t.parentTaskId && !t.isSubtask);
  const completedTasks = tasks.filter((t) => t.status.parent === "Complete").length;

  return (
    <div className="space-y-4">
      {/* ─── Tasks & Milestones Section ─── */}
      <div className="workflow-section">
        <div className="border border-border hover:border-foreground/20 rounded-lg bg-card transition-colors">
          {/* Section Header */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">Tasks & Milestones</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Track progress through project phases</p>
                </div>
                {/* List/Board toggle */}
                <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
                  <button onClick={() => setViewMode("list")}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-3.5 w-3.5 inline mr-1" /> List
                  </button>
                  <button onClick={() => setViewMode("board")}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      viewMode === "board" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Columns className="h-3.5 w-3.5 inline mr-1" /> Board
                  </button>
                </div>
              </div>
              <SectionActionButton
                primaryLabel="Add Task"
                secondaryLabel="Milestone"
                onPrimary={onAddTask}
                onSecondary={onAddMilestone}
              />
            </div>
          </div>

          {/* Section Content */}
          <div className="px-5 pb-4">
            {viewMode === "board" ? (
              <BoardView
                tasks={tasks}
                milestones={milestones}
                memberMap={memberMap}
                onToggleTaskComplete={onToggleTaskComplete}
                onTaskStatusChange={onTaskStatusChange}
                onDeleteTask={onDeleteTask}
                onTitleChange={onTitleChange}
              />
            ) : (
              <div className="space-y-2">
                {/* Inline task creator at top */}
                {isCreatingTask && (
                  <InlineTaskCreator
                    title={newTaskTitle}
                    onTitleChange={onNewTaskTitleChange || (() => {})}
                    onCreate={onCreateTask || (() => {})}
                    onCancel={onCancelCreateTask || (() => {})}
                  />
                )}

                {/* Milestones */}
                {milestones.map((ms) => {
                  const isExpanded = !expandedMilestones || expandedMilestones.size === 0 || expandedMilestones.has(ms.id);
                  const nestedTasks = milestoneTaskMap?.get(ms.id) || [];
                  return (
                    <div key={ms.id} className="flex flex-col">
                      {/* Milestone row */}
                      <div
                        className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/30 transition-colors group border border-transparent hover:border-border"
                        draggable={!!onMilestoneDragStart}
                        onDragStart={(e) => onMilestoneDragStart?.(e, ms)}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); onMilestoneDrop?.(e, ms); }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Drag handle */}
                          {onMilestoneDragStart && (
                            <div className="text-muted-foreground/30 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <GripVertical className="h-4 w-4" />
                            </div>
                          )}
                          {/* Status icon */}
                          <button className="mt-0.5 shrink-0 cursor-pointer hover:opacity-80" title={ms.status === "Completed" ? "Mark incomplete" : "Mark complete"}>
                            {ms.status === "Completed" ? (
                              <div className="w-5 h-5 rounded-sm bg-foreground flex items-center justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5 text-background" />
                              </div>
                            ) : (
                              <Diamond className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{ms.milestoneName}</span>
                              <button
                                onClick={() => onAddNestedTask?.(ms.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-accent rounded transition-all"
                                title="Add task to milestone"
                              >
                                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              {nestedTasks.length > 0 && (
                                <button
                                  onClick={() => onToggleMilestoneExpand?.(ms.id)}
                                  className="p-0.5 hover:bg-accent rounded shrink-0"
                                >
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              )}
                            </div>
                            {ms.description && <p className="text-xs text-muted-foreground truncate">{ms.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {ms.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {ms.dueDate.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full",
                            ms.status === "Completed" ? "bg-success/20 text-success" :
                            ms.status === "Failed" ? "bg-destructive/20 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {ms.status}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Nested tasks inside milestone */}
                      {isExpanded && (nestedTasks.length > 0 || (isCreatingNestedTask && nestedMilestoneId === ms.id)) && (
                        <div className="ml-12 mt-1.5 space-y-1.5 border-l-2 border-border pl-4">
                          {nestedTasks.map((task) => (
                            <TaskCard key={task.id} task={task} memberMap={memberMap} onToggleComplete={onToggleTaskComplete} onStatusChange={onTaskStatusChange} onDelete={onDeleteTask} onTitleChange={onTitleChange} isSubtask />
                          ))}
                          {isCreatingNestedTask && nestedMilestoneId === ms.id && (
                            <InlineTaskCreator
                              title={newNestedTaskTitle}
                              onTitleChange={onNewNestedTaskTitleChange || (() => {})}
                              onCreate={onCreateNestedTask || (() => {})}
                              onCancel={onCancelCreateNestedTask || (() => {})}
                              placeholder="Type task title..."
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tasks */}
                {topLevelTasks.length > 0 ? (
                  topLevelTasks.map((task) => {
                    const subtasks = getSubtasks(task.id);
                    const isExpanded = expandedTasks.has(task.id);
                    return (
                      <div key={task.id}>
                        <TaskCard
                          task={task}
                          memberMap={memberMap}
                          onToggleComplete={onToggleTaskComplete}
                          onStatusChange={onTaskStatusChange}
                          onDelete={onDeleteTask}
                          onTitleChange={onTitleChange}
                          showSubtasks={isExpanded}
                          onToggleSubtasks={onToggleSubtaskExpand}
              onDragStart={onTaskDragStart}
              onDrop={onTaskDrop}
              onDragOver={(e) => { e.preventDefault(); }}
                        />
                        {isExpanded && subtasks.length > 0 && (
                          <div className="mt-1.5 space-y-1.5 pl-5 ml-8 border-l-2 border-border">
                            {subtasks.map((sub) => (
                              <TaskCard key={sub.id} task={sub} memberMap={memberMap} onToggleComplete={onToggleTaskComplete} onStatusChange={onTaskStatusChange} onDelete={onDeleteTask} onTitleChange={onTitleChange} isSubtask />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : milestones.length === 0 && !isCreatingTask ? (
                  <div className="flex items-center justify-center py-6">
                    <button onClick={onAddTask}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-foreground/40 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">Add Task</span>
                    </button>
                  </div>
                ) : null}

                {/* Bottom Add Task button */}
                {topLevelTasks.length > 0 && !isCreatingTask && (
                  <button onClick={onAddTask}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-foreground/40 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add Task</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Progress Summary ─── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>{completedTasks} complete</span>
        <span className="text-muted-foreground/30">|</span>
        <span>{milestones.length} milestone{milestones.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
