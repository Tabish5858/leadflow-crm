"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, query, Timestamp, where } from "firebase/firestore";
import { FolderKanban, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  progress: number;
}

interface ProjectsWidgetProps {
  workspaceId: string;
  userId: string;
}

// Local project type for the basic query (before Phase 3 adds proper clients[] field)
interface RawProject {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  dueDate?: Timestamp;
  progress?: number;
  clients?: string[];
  workspaceId?: string;
}

export function ProjectsWidget({ workspaceId, userId }: ProjectsWidgetProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    (async () => {
      try {
        // Demo mode: serve from in-memory store
        if (isDemoMode()) {
          const { demoStore } = await import("@/lib/demo/demo-data");
          const { getProjects } = await import("@/lib/firebase/projects");
          const projects = demoStore
            .getProjects()
            .filter(
              (p: { clients?: string[] }) => p.clients?.includes(userId)
            )
            .slice(0, 4);
          setProjects(
            projects.map(
              (p: {
                id: string;
                name?: string;
                status?: string;
                dueDate?: Timestamp | null;
                progress?: number;
              }) => ({
                id: p.id,
                title: p.name || "Untitled Project",
                status: p.status || "active",
                dueDate: p.dueDate?.toDate() ?? null,
                progress: p.progress ?? 0,
              })
            )
          );
          setLoading(false);
          return;
        }

        // Try to find projects where user is in clients[] array
        const projectsRef = collection(db, "projects");
        const q = query(
          projectsRef,
          where("workspaceId", "==", workspaceId),
          limit(20)
        );
        const snap = await getDocs(q);

        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RawProject);

        const filtered = raw.filter(
          (p) => p.clients?.includes(userId)
        );

        setProjects(
          filtered.map((p) => ({
            id: p.id,
            title: p.title || p.name || "Untitled Project",
            status: p.status || "active",
            dueDate: p.dueDate?.toDate() ?? null,
            progress: p.progress ?? 0,
          }))
        );
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4 text-primary" />
            Projects
          </CardTitle>
          <CardDescription>Your active projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/60">
              Projects assigned to you will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4 text-primary" />
            Projects
          </CardTitle>
          <Link
            href="/client/projects"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription>
          {projects.length} active project{projects.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {projects.slice(0, 4).map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium truncate">{project.title}</p>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${
                    statusColors[project.status] || ""
                  }`}
                >
                  {project.status}
                </Badge>
              </div>
              {project.progress > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(project.progress, 100)}%` }}
                  />
                </div>
              )}
              {project.dueDate && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Due {project.dueDate.toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
