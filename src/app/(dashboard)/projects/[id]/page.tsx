"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import {
  getProject,
  updateProject as updateProjectFB,
  deleteProject as deleteProjectFB,
} from "@/lib/firebase/projects";
import {
  createTask,
  getProjectTasks,
  updateTask,
  deleteTask,
} from "@/lib/firebase/project-tasks";
import {
  getProjectMilestones,
  createMilestone,
  deleteMilestone,
} from "@/lib/firebase/project-milestones";
import {
  getProjectNotes,
  createNote,
  deleteNote,
} from "@/lib/firebase/project-notes";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type {
  Project,
  ProjectStatus,
  ProjectTask,
  ProjectMilestone,
  ProjectNote,
  WorkspaceMember,
} from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ProjectTabs } from "@/components/projects/shared/project-tabs";
import type { ProjectTabId } from "@/components/projects/shared/project-tabs";
import { TaskCard } from "@/components/projects/shared/task-card";
import { TaskCreateDialog } from "@/components/projects/shared/task-create-dialog";
import type { TaskFormData } from "@/components/projects/shared/task-create-dialog";
import { MilestoneList } from "@/components/projects/shared/milestone-list";
import { ProjectNotes } from "@/components/projects/shared/project-notes";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Edit3,
  FileText,
  Flag,
  ListTodo,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: {
    label: "Active",
    class:
      "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  },
  on_hold: {
    label: "On Hold",
    class:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    class:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    class:
      "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  },
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
  if (!date) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS: { id: ProjectTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "milestones", label: "Milestones" },
  { id: "notes", label: "Notes" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const { firebaseUser } = useAuth();
  const projectId = params.id as string;

  // Core data
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<ProjectTabId>("overview");

  // Task data
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Milestone data
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestoneSaving, setMilestoneSaving] = useState(false);

  // Note data
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Edit dialog state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("active");
  const [editProgress, setEditProgress] = useState("");
  const [editBudget, setEditBudget] = useState("");

  // Build member map once
  const memberMap = useMemo(() => {
    const map = new Map<string, { displayName: string; photoURL?: string | null }>();
    for (const m of members) {
      map.set(m.userId, { displayName: m.displayName, photoURL: m.photoURL });
    }
    return map;
  }, [members]);

  // ─── Load Project ────────────────────────────────────────────────────────────

  const loadProject = useCallback(async () => {
    if (!activeWorkspace?.id || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, memberData] = await Promise.all([
        getProject(projectId),
        getWorkspaceMembers(activeWorkspace.id),
      ]);
      if (!data) {
        setError("Project not found");
        return;
      }
      setProject(data);
      setMembers(memberData);
    } catch {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // ─── Load Tab Data ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    if (activeTab === "tasks") {
      setTasksLoading(true);
      getProjectTasks(projectId)
        .then(setTasks)
        .catch((err) => {
          console.error("Failed to load tasks:", err);
          toast.error("Failed to load tasks");
        })
        .finally(() => setTasksLoading(false));
    }

    if (activeTab === "milestones") {
      setMilestonesLoading(true);
      getProjectMilestones(projectId)
        .then(setMilestones)
        .catch((err) => {
          console.error("Failed to load milestones:", err);
          toast.error("Failed to load milestones");
        })
        .finally(() => setMilestonesLoading(false));
    }

    if (activeTab === "notes") {
      setNotesLoading(true);
      getProjectNotes(projectId)
        .then(setNotes)
        .catch(() => toast.error("Failed to load notes"))
        .finally(() => setNotesLoading(false));
    }
  }, [projectId, activeTab]);

  // ─── Edit / Delete ───────────────────────────────────────────────────────────

  const startEditing = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description || "");
    setEditStatus(project.status);
    setEditProgress(String(project.progress));
    setEditBudget(project.budget ? String(project.budget) : "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!project || !editName.trim()) return;
    setSaving(true);
    try {
      await updateProjectFB(project.id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        status: editStatus,
        progress: Math.min(100, Math.max(0, parseInt(editProgress) || 0)),
        budget: editBudget ? parseFloat(editBudget) : null,
      });
      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              description: editDesc.trim() || null,
              status: editStatus,
              progress: Math.min(100, Math.max(0, parseInt(editProgress) || 0)),
              budget: editBudget ? parseFloat(editBudget) : null,
            }
          : prev
      );
      setEditing(false);
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProjectFB(project.id);
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ─── Task Handlers ───────────────────────────────────────────────────────────

  const handleCreateTask = async (data: TaskFormData) => {
    if (!projectId || !project) return;
    setTaskSaving(true);
    try {
      await createTask(
        projectId,
        project.workspaceId,
        firebaseUser?.uid || "demo",
        {
          taskName: data.taskName,
          description: data.description || null,
          assigneeId: data.assigneeId && data.assigneeId !== "none" ? data.assigneeId : null,
          priority: data.priority && data.priority !== "none" ? (data.priority as "low" | "medium" | "high") : null,
          parentTaskId: data.parentTaskId || null,
          startDate: data.startDate || null,
          dueDate: data.dueDate || null,
        }
      );

      setShowCreateTask(false);
      toast.success("Task created");
      // Reload
      const updated = await getProjectTasks(projectId);
      setTasks(updated);
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("Failed to create task");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleToggleTaskComplete = async (task: ProjectTask) => {
    const isComplete = task.status.parent === "Complete";
    try {
      await updateTask(task.id, {
        status: isComplete
          ? { parent: "To Do", name: "Not Started", color: "#F5EFCF" }
          : { parent: "Complete", name: "Complete", color: "#E8F5E9" },
      } as any);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: isComplete
                  ? { parent: "To Do", name: "Not Started", color: "#F5EFCF" }
                  : { parent: "Complete", name: "Complete", color: "#E8F5E9" },
                completedAt: isComplete ? null : ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any),
              }
            : t
        )
      );
      toast.success(isComplete ? "Task reopened" : "Task completed");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (task: ProjectTask) => {
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const toggleSubtaskExpand = (task: ProjectTask) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };

  // ─── Milestone Handlers ──────────────────────────────────────────────────────

  const handleCreateMilestone = async (data: { milestoneName: string; description: string; dueDate: Date | null }) => {
    if (!projectId || !project) return;
    setMilestoneSaving(true);
    try {
      await createMilestone(projectId, project.workspaceId, firebaseUser?.uid || "demo", {
        milestoneName: data.milestoneName,
        description: data.description || null,
        dueDate: data.dueDate,
      } as any);
      toast.success("Milestone created");
      // Reload
      const updated = await getProjectMilestones(projectId);
      setMilestones(updated);
    } catch {
      toast.error("Failed to create milestone");
    } finally {
      setMilestoneSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId);
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      toast.success("Milestone deleted");
    } catch {
      toast.error("Failed to delete milestone");
    }
  };

  // ─── Note Handlers ───────────────────────────────────────────────────────────

  const handleCreateNote = async (data: { title: string; content: string }) => {
    if (!projectId || !project) return;
    try {
      await createNote(projectId, project.workspaceId, firebaseUser?.uid || "demo", {
        title: data.title,
        content: data.content || null,
        taskId: null,
      } as any);
      toast.success("Note created");
      const updated = await getProjectNotes(projectId);
      setNotes(updated);
    } catch (err) {
      console.error("Failed to create note:", err);
      toast.error("Failed to create note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Failed to delete note");
    }
  };

  // ─── Derived Data ────────────────────────────────────────────────────────────

  const tabBadges = useMemo(() => {
    return {
      tasks: tasks.length > 0 ? String(tasks.length) : undefined,
      milestones: milestones.length > 0 ? String(milestones.length) : undefined,
      notes: notes.length > 0 ? String(notes.length) : undefined,
    };
  }, [tasks.length, milestones.length, notes.length]);

  const tabsWithBadges = useMemo(
    () =>
      TABS.map((t) => ({
        ...t,
        badge: tabBadges[t.id as keyof typeof tabBadges],
      })),
    [tabBadges]
  );

  const clientMembers = useMemo(
    () => members.filter((m) => project?.clients?.includes(m.userId)),
    [members, project?.clients]
  );

  const topLevelTasks = useMemo(
    () => tasks.filter((t) => !t.parentTaskId && !t.isSubtask),
    [tasks]
  );

  const getSubtasks = useCallback(
    (parentId: string) => tasks.filter((t) => t.parentTaskId === parentId && t.isSubtask),
    [tasks]
  );

  // ═══ RENDER ═══════════════════════════════════════════════════════════════════

  // ─── Loading State ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────────

  if (error || !project) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-destructive">
              {error || "Project not found"}
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Normal Render ───────────────────────────────────────────────────────────

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Back Link ── */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {project.name}
            </h1>
            <Badge variant="outline" className={statusCfg.class}>
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created{" "}
            {project.createdAt
              ? formatDate(project.createdAt.toDate())
              : "Unknown"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <ProjectTabs
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── Tab Content ── */}
      <div className="min-h-[300px]">
        {/* ═══ OVERVIEW ════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {project.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(project.progress, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clients */}
              {clientMembers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clients
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {clientMembers.map((client) => (
                      <div
                        key={client.userId}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src={client.photoURL || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(client.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {client.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusCfg.class}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <p className="text-sm font-medium capitalize">
                      {project.priority}
                    </p>
                  </div>
                  {project.budget && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: project.currency,
                        }).format(project.budget)}
                      </p>
                    </div>
                  )}
                  <Separator />
                  {project.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Start: {formatDate(project.startDate.toDate())}
                      </span>
                    </div>
                  )}
                  {project.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Due: {formatDate(project.dueDate.toDate())}
                      </span>
                    </div>
                  )}
                  {project.completedDate && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Completed:{" "}
                        {formatDate(project.completedDate.toDate())}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notes (compact) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectNotes
                    notes={notes.slice(0, 3)}
                    memberMap={memberMap}
                    onCreateNote={handleCreateNote}
                    onDeleteNote={handleDeleteNote}
                    compact
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TASKS ═══════════════════════════════════════════════════════════ */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {/* Task header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListTodo className="h-4 w-4" />
                <span>
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground/40">|</span>
                <span>
                  {tasks.filter((t) => t.status.parent === "Complete").length}{" "}
                  complete
                </span>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowCreateTask(true)}
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>

            {/* Task list */}
            {tasksLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : topLevelTasks.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  No tasks yet
                </p>
                <p className="text-xs text-muted-foreground/60 mb-4">
                  Break your project into manageable tasks.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTask(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create your first task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {topLevelTasks.map((task) => {
                  const subtasks = getSubtasks(task.id);
                  const isExpanded = expandedTasks.has(task.id);
                  return (
                    <div key={task.id}>
                      <TaskCard
                        task={task}
                        memberMap={memberMap}
                        onToggleComplete={handleToggleTaskComplete}
                        onDelete={handleDeleteTask}
                        showSubtasks={isExpanded}
                        onToggleSubtasks={toggleSubtaskExpand}
                      />
                      {/* Subtasks */}
                      {isExpanded && subtasks.length > 0 && (
                        <div className="mt-1 space-y-1 pl-4 border-l-2 border-muted ml-6">
                          {subtasks.map((sub) => (
                            <TaskCard
                              key={sub.id}
                              task={sub}
                              memberMap={memberMap}
                              onToggleComplete={handleToggleTaskComplete}
                              onDelete={handleDeleteTask}
                              isSubtask
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create Task Dialog */}
            <TaskCreateDialog
              open={showCreateTask}
              onOpenChange={setShowCreateTask}
              onSubmit={handleCreateTask}
              members={members}
              saving={taskSaving}
            />
          </div>
        )}

        {/* ═══ MILESTONES ═════════════════════════════════════════════════════ */}
        {activeTab === "milestones" && (
          <div>
            {milestonesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <MilestoneList
                milestones={milestones}
                onCreate={handleCreateMilestone}
                onDelete={handleDeleteMilestone}
                saving={milestoneSaving}
              />
            )}
          </div>
        )}

        {/* ═══ NOTES ══════════════════════════════════════════════════════════ */}
        {activeTab === "notes" && (
          <div>
            {notesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="max-w-2xl">
                <ProjectNotes
                  notes={notes}
                  memberMap={memberMap}
                  onCreateNote={handleCreateNote}
                  onDeleteNote={handleDeleteNote}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as ProjectStatus)}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={editProgress}
                  onChange={(e) => setEditProgress(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-budget">Budget (USD)</Label>
              <Input
                id="edit-budget"
                type="number"
                min="0"
                step="0.01"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{project.name}&rdquo; and all
              its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
