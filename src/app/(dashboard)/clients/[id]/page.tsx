"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  ArrowLeft,
  FolderKanban,
  History,
  Mail,
  Trash2,
  UserPlus,
  Loader2,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { useWorkspace } from "@/contexts/workspace-context";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { toast } from "@/lib/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Project, ProjectStatus } from "@/types";

interface ClientUser {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Date | null;
  lastActiveAt: Date | null;
  role: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  },
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  inactive: {
    label: "Inactive",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  },
};

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  on_hold:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Not yet active";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, activeWorkspace } = useWorkspace();
  const { id: clientUserId } = use(params);

  const [client, setClient] = useState<ClientUser | null>(null);
  const [clientStatus, setClientStatus] = useState<string>("inactive");
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set()
  );

  const canEdit = user?.role === "owner" || user?.role === "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const loadClientData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.id || !clientUserId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userSnap] = await Promise.all([
          getDoc(doc(db, "users", clientUserId)),
          getDoc(doc(db, "workspaces", activeWorkspace.id)),
        ]);

        if (!userSnap.exists()) {
          setError("Client not found");
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const workspaceRoles: Record<string, string> =
          userData.workspaceRoles || {};
        const role =
          workspaceRoles[activeWorkspace.id] || userData.role || "";

        const clientData: ClientUser = {
          id: clientUserId,
          displayName: userData.displayName || "Unnamed Client",
          email: userData.email || "",
          photoURL: userData.photoURL || null,
          createdAt: userData.createdAt?.toDate?.() || null,
          lastActiveAt: userData.lastActiveAt?.toDate?.() || null,
          role,
        };
        setClient(clientData);

        const status =
          role === "client"
            ? "active"
            : userData.workspaceIds?.includes(activeWorkspace.id)
              ? "inactive"
              : "pending";
        setClientStatus(status);

        const projectsSnap = await getDocs(
          query(
            collection(db, "projects"),
            where("workspaceId", "==", activeWorkspace.id),
            where("clients", "array-contains", clientUserId)
          )
        );
        const assigned: Project[] = [];
        projectsSnap.forEach((d) => {
          assigned.push({ id: d.id, ...d.data() } as Project);
        });
        setAssignedProjects(assigned);

        const allProjectsSnap = await getDocs(
          query(
            collection(db, "projects"),
            where("workspaceId", "==", activeWorkspace.id)
          )
        );
        const all: Project[] = [];
        allProjectsSnap.forEach((d) => {
          all.push({ id: d.id, ...d.data() } as Project);
        });
        setAllProjects(all);
      } catch (err) {
        console.error("Failed to load client data:", err);
        setError("Failed to load client information. Please try again.");
        toast.error("Failed to load client data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeWorkspace?.id, clientUserId, refreshKey]);

  async function handleRemoveClient() {
    if (!activeWorkspace?.id || !clientUserId || !user) return;
    setRemoving(true);
    try {
      const wsRef = doc(db, "workspaces", activeWorkspace.id);
      const wsSnap = await getDoc(wsRef);
      if (!wsSnap.exists()) throw new Error("Workspace not found");

      const wsData = wsSnap.data();
      const updatedMembers = (wsData.memberIds || []).filter(
        (id: string) => id !== clientUserId
      );
      await updateDoc(wsRef, { memberIds: updatedMembers });

      const userRef = doc(db, "users", clientUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const workspaceIds = (userData.workspaceIds || []).filter(
          (id: string) => id !== activeWorkspace.id
        );
        await updateDoc(userRef, { workspaceIds });
      }

      toast.success("Client removed from workspace");
      router.push("/clients");
    } catch (err) {
      console.error("Failed to remove client:", err);
      toast.error("Failed to remove client");
    } finally {
      setRemoving(false);
      setRemoveOpen(false);
    }
  }

  function openAssignDialog() {
    setSelectedProjectIds(new Set(assignedProjects.map((p) => p.id)));
    setAssignOpen(true);
  }

  function toggleProjectSelection(projectId: string) {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function handleSaveAssignments() {
    if (!activeWorkspace?.id || !clientUserId) return;
    setSavingAssignments(true);

    const currentlyAssigned = new Set(assignedProjects.map((p) => p.id));
    const toAdd = [...selectedProjectIds].filter(
      (id) => !currentlyAssigned.has(id)
    );
    const toRemove = [...currentlyAssigned].filter(
      (id) => !selectedProjectIds.has(id)
    );

    try {
      const operations: Promise<void>[] = [];

      for (const projectId of toAdd) {
        const projectRef = doc(db, "projects", projectId);
        operations.push(
          updateDoc(projectRef, { clients: arrayUnion(clientUserId) })
        );
      }

      for (const projectId of toRemove) {
        const projectRef = doc(db, "projects", projectId);
        operations.push(
          updateDoc(projectRef, { clients: arrayRemove(clientUserId) })
        );
      }

      await Promise.all(operations);

      toast.success("Project assignments updated");
      setAssignOpen(false);
      loadClientData();
    } catch (err) {
      console.error("Failed to update assignments:", err);
      toast.error("Failed to update project assignments");
    } finally {
      setSavingAssignments(false);
    }
  }

  if (loading) {
    return (
      <RequireModuleAccess moduleId="clients">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-44" />
                <Separator />
                <div className="w-full space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="flex flex-col items-center py-8">
                  <Skeleton className="h-10 w-10 rounded-full mb-3" />
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </RequireModuleAccess>
    );
  }

  if (error || !client) {
    return (
      <RequireModuleAccess moduleId="clients">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <Trash2 className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            {error || "Client not found"}
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            {error
              ? "There was an issue loading this client\u2019s information."
              : "The client you\u2019re looking for doesn\u2019t exist or has been removed."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Link>
            </Button>
            {error && <Button onClick={loadClientData}>Try Again</Button>}
          </div>
        </div>
      </RequireModuleAccess>
    );
  }

  return (
    <RequireModuleAccess moduleId="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/clients">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight truncate">
                  {client.displayName}
                </h1>
                <Badge
                  className={cn(
                    "border font-medium shrink-0",
                    STATUS_CONFIG[clientStatus]?.className
                  )}
                >
                  {STATUS_CONFIG[clientStatus]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5 truncate">
                {client.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/messages`}>
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </Link>
            </Button>
            {canEdit && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Client
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 border mb-4">
                <AvatarImage src={client.photoURL || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(client.displayName) || "C"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{client.displayName}</h3>
              <p className="text-sm text-muted-foreground">{client.email}</p>
              <Separator className="my-4" />
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Member since:</span>
                  <span className="font-medium">
                    {formatDate(client.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Last active:</span>
                  <span className="font-medium">
                    {formatRelativeTime(client.lastActiveAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Project Assignments
                  </CardTitle>
                  <CardDescription>
                    Projects this client is assigned to.
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={openAssignDialog}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign to Project
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {assignedProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No projects assigned
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Assign projects to this client to get started.
                    </p>
                    {canEdit && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={openAssignDialog}
                      >
                        Assign Project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {assignedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            "border font-medium capitalize shrink-0 ml-4",
                            PROJECT_STATUS_STYLES[project.status]
                          )}
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Recent activity from this client.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Activity tracking coming soon
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Client activity will appear here once tracking is enabled.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign to Project</DialogTitle>
            <DialogDescription>
              Select the projects you want to assign {client.displayName} to.
            </DialogDescription>
          </DialogHeader>

          {allProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No projects available
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Create a project first before assigning clients.
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto py-2">
              {allProjects.map((project) => {
                const isSelected = selectedProjectIds.has(project.id);
                return (
                  <label
                    key={project.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() =>
                        toggleProjectSelection(project.id)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.status.replace("_", " ")}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "border font-medium capitalize shrink-0",
                        PROJECT_STATUS_STYLES[project.status]
                      )}
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                  </label>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignments}
              disabled={savingAssignments || allProjects.length === 0}
            >
              {savingAssignments ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{client.displayName}</strong> from this workspace? They
              will lose access to the client portal and all assigned projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveClient}
              disabled={removing}
            >
              {removing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequireModuleAccess>
  );
}
