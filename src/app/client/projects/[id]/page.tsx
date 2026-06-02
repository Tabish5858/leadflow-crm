"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientUser } from "@/contexts/client-user-context";
import { db } from "@/lib/firebase/client";
import type { Project, Task as TaskType } from "@/types";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  Calendar,
  Circle,
  CircleCheck,
  Clock,
  DollarSign,
  ListTodo,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BackButton,
  ErrorState,
  SkeletonList,
  SkeletonCard,
} from "@/components/client/module-layout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-muted text-muted-foreground",
};

export default function ClientProjectDetailPage() {
  const params = useParams();
  const { clientWorkspaceId, uid } = useClientUser();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clientWorkspaceId || !id) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const projSnap = await getDoc(doc(db, "projects", id));
        if (!projSnap.exists()) {
          setError(new Error("Project not found"));
          return;
        }
        const data = { id: projSnap.id, ...projSnap.data() } as Project;

        // Verify client is assigned
        if (data.workspaceId !== clientWorkspaceId || !data.clients?.includes(uid)) {
          setError(new Error("You don't have access to this project"));
          return;
        }

        setProject(data);

        // Fetch tasks if project has a leadId
        if (data.leadId) {
          const tasksRef = collection(db, "tasks");
          const tasksQ = query(
            tasksRef,
            where("workspaceId", "==", clientWorkspaceId),
            where("leadId", "==", data.leadId),
            orderBy("createdAt", "desc")
          );
          const tasksSnap = await getDocs(tasksQ);
          setTasks(
            tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskType)
          );
        }
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientWorkspaceId, id]);

  if (loading) {
    return (
      <div>
        <BackButton href="/client/projects" />
        <SkeletonCard className="mb-6" />
        <SkeletonList count={3} height="h-16" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <BackButton href="/client/projects" />
        <ErrorState
          message={error?.message || "Project not found"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <BackButton href="/client/projects" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 ${
              STATUS_COLORS[project.status] || ""
            }`}
          >
            {project.status === "on_hold" ? "On Hold" : project.status}
          </Badge>
        </div>
      </div>

      {/* Project info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.progress}%</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(project.progress, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.dueDate
                ? project.dueDate.toDate().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "-"}
            </div>
            {project.startDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Started{" "}
                {project.startDate.toDate().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListTodo className="h-4 w-4" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTasks}/{tasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.budget != null
                ? `${project.currency || "USD"} ${project.budget.toLocaleString()}`
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks section */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4 text-primary" />
              Tasks ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {task.status === "completed" ? (
                    <CircleCheck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        task.status === "completed"
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <span>
                          Due{" "}
                          {task.dueDate.toDate().toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          task.priority === "urgent" || task.priority === "high"
                            ? "border-red-200 text-red-600 dark:border-red-800"
                            : ""
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state if no tasks but project exists */}
      {tasks.length === 0 && project && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <ListTodo className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
