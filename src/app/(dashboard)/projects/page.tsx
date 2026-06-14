"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { getProjects } from "@/lib/firebase/projects";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type { Project, WorkspaceMember } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import ProjectKanbanBoard from "@/components/projects/shared/project-kanban-board";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  FolderKanban,
  LayoutGrid,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: "Active", class: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  on_hold: { label: "On Hold", class: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  completed: { label: "Completed", class: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
  cancelled: { label: "Cancelled", class: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const VIEW_MODE_KEY = "leadflow_projects_view_mode";

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { activeWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "board">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(VIEW_MODE_KEY) as "grid" | "board") || "grid";
    }
    return "grid";
  });

  const loadProjects = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, memberData] = await Promise.all([
        getProjects(activeWorkspace.id),
        getWorkspaceMembers(activeWorkspace.id),
      ]);
      setProjects(data);
      setMembers(memberData);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.displayName])),
    [members]
  );

  const filtered = useMemo(() => {
    let items = projects;
    if (statusFilter !== "all") {
      items = items.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    // Sort: active first, then by priority
    return [...items].sort((a, b) => {
      const aOrder = STATUS_CONFIG[a.status] ? 0 : 1;
      const bOrder = STATUS_CONFIG[b.status] ? 0 : 1;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <RequireModuleAccess moduleId="projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading..." : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* View toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              const mode = v as "grid" | "board";
              setViewMode(mode);
              localStorage.setItem(VIEW_MODE_KEY, mode);
            }}
          >
            <TabsList>
              <TabsTrigger value="grid" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" />
                Board
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        {loading ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto" style={{ height: "calc(100vh - 280px)" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[280px] w-[280px] flex-shrink-0 space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <Skeleton key={j} className="h-28 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadProjects}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "board" ? (
          <ProjectKanbanBoard
            projects={projects}
            statusFilter={statusFilter}
            onRefresh={loadProjects}
          />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first project to get started."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button asChild className="mt-4">
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => {
              const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
              const clientNames = project.clients
                .map((cid) => memberMap.get(cid))
                .filter(Boolean)
                .join(", ");

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/30 cursor-pointer">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate">{project.name}</h3>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] px-1.5 py-0 ${statusCfg.class}`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="truncate">{clientNames || "No clients"}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(project.progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {project.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Due {formatDate(project.dueDate.toDate())}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </RequireModuleAccess>
  );
}
