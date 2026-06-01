"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { auth, db } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Eye,
  Mail,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ClientMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  joinedAt: string;
  projectCount: number;
}

interface ClientInvite {
  id: string;
  email: string;
  name?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  invitedByName?: string;
}

export default function ClientsPage() {
  const { user, activeWorkspace } = useWorkspace();

  const [clients, setClients] = useState<ClientMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ClientInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteSentLink, setInviteSentLink] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [removeTarget, setRemoveTarget] = useState<ClientMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const canManage = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    loadData();
    if (canManage) {
      initPortalSettings(activeWorkspace.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, canManage]);

  async function loadData() {
    await loadClients();
    await loadPendingInvites();
  }

  async function initPortalSettings(wsId: string) {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      await fetch("/api/workspaces/clients/init-portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "x-workspace-id": wsId,
        },
      });
    } catch {
      // Non-critical
    }
  }

  async function loadClients() {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);

    try {
      const wsSnap = await getDoc(
        doc(db, "workspaces", activeWorkspace.id)
      );
      if (!wsSnap.exists()) {
        setLoading(false);
        return;
      }

      const wsData = wsSnap.data();
      const memberIds: string[] = wsData.memberIds || [];

      if (memberIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const usersSnap = await getDocs(
        query(
          collection(db, "users"),
          where("__name__", "in", memberIds.slice(0, 10))
        )
      );

      const projectsSnap = await getDocs(
        query(
          collection(db, "projects"),
          where("workspaceId", "==", activeWorkspace.id)
        )
      );

      const projectClientMap = new Map<string, number>();
      projectsSnap.forEach((d) => {
        const projectData = d.data();
        const projectClients: string[] = projectData.clients || [];
        for (const uid of projectClients) {
          projectClientMap.set(
            uid,
            (projectClientMap.get(uid) || 0) + 1
          );
        }
      });

      const clientList: ClientMember[] = [];
      usersSnap.forEach((d) => {
        const userData = d.data();
        const role =
          userData.workspaceRoles?.[activeWorkspace.id] || userData.role;
        if (role === "client") {
          clientList.push({
            userId: d.id,
            email: userData.email || "",
            displayName: userData.displayName || "",
            photoURL: userData.photoURL || null,
            joinedAt:
              userData.createdAt?.toDate?.()?.toLocaleDateString() || "—",
            projectCount: projectClientMap.get(d.id) || 0,
          });
        }
      });

      setClients(clientList);
    } catch (err) {
      console.error("Failed to load clients:", err);
      setError("Failed to load client list");
      toast.error("Failed to load client list");
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingInvites() {
    if (!activeWorkspace?.id) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch(`/api/workspaces/clients/pending-invites`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "x-workspace-id": activeWorkspace.id,
        },
      });

      if (!res.ok) {
        console.error("Failed to load pending invites:", await res.text());
        return;
      }

      const data = await res.json();
      const invites: ClientInvite[] = (data.invites || []).map(
        (inv: {
          id: string;
          email: string;
          name?: string;
          status: string;
          createdAt: string | null;
          expiresAt: string | null;
          invitedByName: string;
        }) => ({
          id: inv.id,
          email: inv.email,
          name: inv.name,
          status: inv.status,
          createdAt: inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString()
            : "—",
          expiresAt: inv.expiresAt
            ? new Date(inv.expiresAt).toLocaleDateString()
            : "—",
          invitedByName: inv.invitedByName,
        })
      );

      setPendingInvites(invites);
    } catch (err) {
      console.error("Failed to load pending invites:", err);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !activeWorkspace?.id || !user) return;
    setSending(true);
    setInviteSentLink(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/workspaces/clients/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "x-workspace-id": activeWorkspace.id,
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          message: inviteMessage || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send invitation");
        setSending(false);
        return;
      }

      toast.success("Invitation sent successfully!");

      const link = data.inviteId
        ? `${window.location.origin}/client/accept?inviteId=${data.inviteId}`
        : null;
      if (link) setInviteSentLink(link);

      setInviteEmail("");
      setInviteName("");
      setInviteMessage("");
      loadPendingInvites();
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  async function handleRemove(client: ClientMember) {
    if (!activeWorkspace?.id || !canManage) return;
    setRemoving(true);
    try {
      await updateDoc(doc(db, "users", client.userId), {
        [`workspaceRoles.${activeWorkspace.id}`]: deleteField(),
      });

      const wsRef = doc(db, "workspaces", activeWorkspace.id);
      const wsSnap = await getDoc(wsRef);
      if (wsSnap.exists()) {
        const wsData = wsSnap.data();
        const updatedMemberIds = (wsData.memberIds || []).filter(
          (id: string) => id !== client.userId
        );
        await updateDoc(wsRef, { memberIds: updatedMemberIds });
      }

      toast.success(`${client.displayName || client.email} removed from clients`);
      setRemoveTarget(null);
      loadClients();
    } catch (err) {
      console.error("Failed to remove client:", err);
      toast.error("Failed to remove client");
    } finally {
      setRemoving(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteSentLink) return;
    try {
      await navigator.clipboard.writeText(inviteSentLink);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  const searchFilter = (c: ClientMember) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  };

  const searchFilterInvite = (i: ClientInvite) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.email.toLowerCase().includes(q) ||
      (i.name || "").toLowerCase().includes(q)
    );
  };

  const filteredClients = clients.filter(searchFilter);
  const filteredInvites = pendingInvites.filter(searchFilterInvite);

  const showClients =
    activeTab === "all" || activeTab === "active";
  const showInvites =
    activeTab === "all" || activeTab === "pending";

  return (
    <RequireModuleAccess moduleId="clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">
              Manage client access to your workspace portal.
            </p>
          </div>
          {canManage && (
            <Dialog
              open={inviteOpen}
              onOpenChange={(open) => {
                setInviteOpen(open);
                if (!open) {
                  setInviteSentLink(null);
                  setInviteEmail("");
                  setInviteName("");
                  setInviteMessage("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Invite a Client</DialogTitle>
                    <DialogDescription>
                      Send an invitation to access your workspace client
                      portal.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="client@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-name">
                        Client name{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="invite-name"
                        placeholder="Acme Corp"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-message">
                        Personal message{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id="invite-message"
                        placeholder="We've set up your client portal..."
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        maxLength={500}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max 500 characters
                      </p>
                    </div>

                    {inviteSentLink && (
                      <div className="rounded-lg border bg-muted/50 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Invite link
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                            {inviteSentLink}
                          </code>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCopyLink}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                    >
                      {inviteSentLink ? "Close" : "Cancel"}
                    </Button>
                    {!inviteSentLink && (
                      <Button type="submit" disabled={sending}>
                        {sending ? "Sending..." : "Send Invitation"}
                      </Button>
                    )}
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{clients.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {clients.filter((c) => c.projectCount > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">
                with active projects
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Invites
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {pendingInvites.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">
                All
                {clients.length + pendingInvites.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({clients.length + pendingInvites.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="active">
                Active
                {clients.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({clients.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {pendingInvites.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({pendingInvites.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main List Card */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldAlert className="mb-3 h-10 w-10 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={loadData}
                >
                  Retry
                </Button>
              </div>
            ) : showClients && filteredClients.length === 0 && showInvites && filteredInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search
                    ? "No clients match your search"
                    : "Invite your first client to get started"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {search
                    ? "Try a different name or email"
                    : "Clients can access their portal, view projects, and more."}
                </p>
                {canManage && !search && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {/* Client items */}
                {showClients &&
                  (search
                    ? filteredClients
                    : clients
                  ).length > 0 && (
                    <>
                      {(search ? filteredClients : clients).map(
                        (client) => (
                          <div
                            key={client.userId}
                            className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <Link
                               href={`/clients/${client.userId}`}
                              className="flex items-center gap-3 flex-1 min-w-0"
                            >
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage
                                  src={client.photoURL || undefined}
                                />
                                <AvatarFallback className="text-sm">
                                  {client.displayName?.charAt(0) || "C"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {client.displayName || "Unnamed Client"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {client.email}
                                </p>
                              </div>
                            </Link>

                            <div className="flex items-center gap-3 shrink-0">
                              <Badge
                                variant={
                                  client.projectCount > 0
                                    ? "default"
                                    : "secondary"
                                }
                                className="shrink-0"
                              >
                                {client.projectCount > 0
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>

                              <span className="hidden text-xs text-muted-foreground sm:inline shrink-0">
                                {client.projectCount}{" "}
                                {client.projectCount === 1
                                  ? "project"
                                  : "projects"}
                              </span>

                              <span className="hidden text-xs text-muted-foreground md:inline shrink-0">
                                {client.joinedAt}
                              </span>

                              {canManage && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <a
                                      href="/client/dashboard"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="sr-only sm:not-sr-only sm:ml-1.5">
                                        Preview
                                      </span>
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setRemoveTarget(client)
                                    }
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:ml-1.5">
                                      Remove
                                    </span>
                                  </Button>
                                </div>
                              )}

                              {!canManage && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a
                                    href="/client/dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:ml-1.5">
                                      Preview
                                    </span>
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                {/* Separator when both clients and invites shown */}
                {showClients &&
                  showInvites &&
                  clients.length > 0 &&
                  pendingInvites.length > 0 && (
                    <div className="px-6 py-2 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">
                        PENDING INVITATIONS
                      </p>
                    </div>
                  )}

                {/* Invite items */}
                {showInvites &&
                  (search
                    ? filteredInvites
                    : pendingInvites
                  ).length > 0 && (
                    <>
                      {(search
                        ? filteredInvites
                        : pendingInvites
                      ).map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-3 px-6 py-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {invite.name || invite.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {invite.name ? `${invite.email} · ` : ""}
                              Invited by {invite.invitedByName} · Expires{" "}
                              {invite.expiresAt}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          >
                            Pending
                          </Badge>
                        </div>
                      ))}
                    </>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove client</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {removeTarget?.displayName || removeTarget?.email}
              </strong>
              ? They will lose access to the client portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => removeTarget && handleRemove(removeTarget)}
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequireModuleAccess>
  );
}
