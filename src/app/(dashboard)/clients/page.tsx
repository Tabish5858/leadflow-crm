"use client";

import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/workspace-context";
import { db } from "@/lib/firebase/client";
import { toast } from "@/lib/toast";
import { auth } from "@/lib/firebase/client";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { UserCheck, UserPlus, Mail, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface ClientMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  joinedAt: string;
}

interface ClientInvite {
  id: string;
  email: string;
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);

  const canInvite =
    user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    loadClients();
    loadPendingInvites();
    // Initialize default portal settings if owner/admin
    if (canInvite) {
      initPortalSettings(activeWorkspace.id);
    }
  }, [activeWorkspace?.id]);

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
      // Non-critical — settings will be created on first agency settings page visit
    }
  }

  async function loadClients() {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      // Fetch workspace to get member IDs
      const wsSnap = await getDoc(doc(db, "workspaces", activeWorkspace.id));
      if (!wsSnap.exists()) return;
      const wsData = wsSnap.data();
      const memberIds: string[] = wsData.memberIds || [];

      if (memberIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Fetch users and filter by client role
      const usersSnap = await getDocs(
        query(
          collection(db, "users"),
          where("__name__", "in", memberIds.slice(0, 10))
        )
      );

      const clientList: ClientMember[] = [];
      usersSnap.forEach((d) => {
        const userData = d.data();
        const role =
          userData.workspaceRoles?.[activeWorkspace.id] ||
          userData.role;
        if (role === "client") {
          clientList.push({
            userId: d.id,
            email: userData.email || "",
            displayName: userData.displayName || "",
            photoURL: userData.photoURL || null,
            joinedAt: userData.createdAt?.toDate?.()?.toLocaleDateString() || "—",
          });
        }
      });

      setClients(clientList);
    } catch (err) {
      console.error("Failed to load clients:", err);
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

      const res = await fetch(
        `/api/workspaces/clients/pending-invites`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "x-workspace-id": activeWorkspace.id,
          },
        }
      );

      if (!res.ok) {
        console.error("Failed to load pending invites:", await res.text());
        return;
      }

      const data = await res.json();
      const invites: ClientInvite[] = (data.invites || []).map(
        (inv: {
          id: string;
          email: string;
          status: string;
          createdAt: string | null;
          expiresAt: string | null;
          invitedByName: string;
        }) => ({
          id: inv.id,
          email: inv.email,
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
      setInviteOpen(false);
      setInviteEmail("");
      setInviteMessage("");
      loadPendingInvites();
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  return (
    <RequireModuleAccess moduleId="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">
              Manage client access to your workspace portal.
            </p>
          </div>

          {canInvite && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
                      Send an invitation to access your workspace client portal.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="client@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        Personal message{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="We&apos;ve set up your client portal..."
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        maxLength={500}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max 500 characters
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sending}>
                      {sending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Active Clients
            </CardTitle>
            <CardDescription>
              Users with client portal access to this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No clients yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Invite clients to give them portal access.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {clients.map((client) => (
                  <div
                    key={client.userId}
                    className="flex items-center gap-3 py-3"
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={client.photoURL || undefined} />
                      <AvatarFallback className="text-sm">
                        {client.displayName?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {client.displayName || "Unnamed Client"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {client.joinedAt}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No pending invitations
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  All sent invitations have been accepted.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invited by {invite.invitedByName} &middot; Expires{" "}
                        {invite.expiresAt}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireModuleAccess>
  );
}
