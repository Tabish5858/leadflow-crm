"use client";

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
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { fetchClientProjects, type ProjectSummary } from "@/lib/client/client-data";
import { FolderKanban, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ErrorState,
  PageHeader,
  SkeletonList,
} from "@/components/client/module-layout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-muted text-muted-foreground",
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function ClientProjectsPage() {
  const { clientWorkspaceId, uid } = useClientUser();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!clientWorkspaceId || !uid) return;
    setLoading(true);
    setError(null);
    fetchClientProjects(clientWorkspaceId, uid, 100)
      .then(setProjects)
      .catch((e) => setError(e as Error))
      .finally(() => setLoading(false));
  }, [clientWorkspaceId, uid]);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    // Sort: active first, then by priority
    return [...list].sort((a, b) => {
      const aScore = a.status === "active" ? 0 : 1;
      const bScore = b.status === "active" ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
    });
  }, [projects, search, statusFilter]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    fetchClientProjects(clientWorkspaceId, uid, 100)
      .then(setProjects)
      .catch((e) => setError(e as Error))
      .finally(() => setLoading(false));
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Projects" description="View your assigned projects" />
        <ErrorState message={error.message} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={
          loading
            ? "Loading your projects..."
            : `${projects.length} project${projects.length !== 1 ? "s" : ""} assigned to you`
        }
      />

      {/* Search + filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList count={4} height="h-24" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {search || statusFilter !== "all"
                ? "No matching projects"
                : "No projects yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== "all"
                ? "Try changing your search or filter."
                : "Projects assigned to you will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="group block"
            >
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                      {project.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${
                        STATUS_COLORS[project.status] || ""
                      }`}
                    >
                      {project.status === "on_hold" ? "On Hold" : project.status}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Due date + priority */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {project.dueDate
                        ? `Due ${project.dueDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : "No due date"}
                    </span>
                    <span className="capitalize">{project.priority}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length > 12 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="gap-2">
            <Loader2 className="h-4 w-4" />
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClientProjectsPageWrapper() {
  return (
    <ModuleGuard moduleKey="projects">
      <ClientProjectsPage />
    </ModuleGuard>
  );
}
