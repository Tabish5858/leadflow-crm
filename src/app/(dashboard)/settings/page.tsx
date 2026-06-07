"use client";

import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCENT_OPTIONS, useAccent, type AccentColor } from "@/contexts/accent-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { renderInviteEmail } from "@/lib/email-templates";
import { updateUserProfile } from "@/lib/firebase/users";
import {
  cancelInvite,
  createInvite,
  deleteWorkspace,
  getPendingInvitesForWorkspace,
  getWorkspaceMembers,
  leaveWorkspace,
  removeMemberFromWorkspace,
  updateMemberRole,
  updateWorkspace,
  updateWorkspaceName,
} from "@/lib/firebase/workspaces";
import { useAuth } from "@/lib/hooks/use-auth";
import { getApiAuthHeaders } from "@/lib/api/client";
import { getEffectivePermissions } from "@/lib/permissions";
import { useLeadStore } from "@/lib/stores/leadStore";
import { toast } from "@/lib/toast";
import type { WorkspaceInvite, WorkspaceMember } from "@/types";
import {
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_VIEWER_PERMISSIONS,
  MODULE_LABELS,
  type ModuleId,
  type ModulePermissionsByRole
} from "@/types";
import {
  Building2,
  Check,
  Clock,
  Crown,
  FileText,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Pencil,
  Plug,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserCircle,
  Users,
  RefreshCw,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Dynamically loaded tab content - only loaded when user clicks the tab
const CalendarConnection = dynamic(() => import("@/components/settings/calendar-connection").then((mod) => mod.CalendarConnection), {
  loading: () => <div className="p-8 animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-24 bg-muted rounded" /></div>,
});

type Tab = "profile" | "workspace" | "members" | "preferences" | "integrations" | "client-portal";

export default function SettingsPage() {
  const { user, activeWorkspace, workspaces, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const VALID_SETTINGS_TABS: Tab[] = ["profile","workspace","members","preferences","integrations","client-portal"];
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  // Read tab from URL on mount; fallback to localStorage hint
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (p && VALID_SETTINGS_TABS.includes(p)) { setActiveTab(p); return; }
    const saved = localStorage.getItem("leadflow_settings_tab");
    if (saved === "profile") {
      localStorage.removeItem("leadflow_settings_tab");
      setActiveTab("profile");
    }
  }, []);
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<(WorkspaceInvite & { id: string })[]>([]);
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set());
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState(user?.displayName || "");
  const [profilePhotoURL, setProfilePhotoURL] = useState(user?.photoURL || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);

  const handleResetPassword = async () => {
    if (!firebaseUser?.email) {
      toast.error("No email address on file");
      return;
    }
    setResettingPwd(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: firebaseUser.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send reset email");
        return;
      }
      toast.success("Password reset email sent! Check your inbox.");
    } catch {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setResettingPwd(false);
    }
  };

  const isOwner = activeWorkspace?.ownerId === user?.id;
  const { refreshStats } = useLeadStore();
  const { accent, setAccent } = useAccent();
  const [modulePermissions, setModulePermissions] = useState<ModulePermissionsByRole>({
    member: { ...DEFAULT_MEMBER_PERMISSIONS },
    viewer: { ...DEFAULT_VIEWER_PERMISSIONS },
  });
  const [savingPermissions, setSavingPermissions] = useState(false);

  const handleToggleModule = (role: "member" | "viewer", moduleId: ModuleId) => {
    setModulePermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [moduleId]: !prev[role][moduleId] },
    }));
  };

  const handleSavePermissions = async () => {
    if (!activeWorkspace) return;
    setSavingPermissions(true);
    try {
      await updateWorkspace(activeWorkspace.id, { modulePermissions });
      await refreshWorkspaces();
      toast.success("Permissions saved");
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPermissions = () => {
    setModulePermissions({
      member: { ...DEFAULT_MEMBER_PERMISSIONS },
      viewer: { ...DEFAULT_VIEWER_PERMISSIONS },
    });
  };

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      if (activeWorkspace.modulePermissions) {
        setModulePermissions(activeWorkspace.modulePermissions);
      }
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || "");
      setProfilePhotoURL(user.photoURL || "");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "members" && activeWorkspace) {
      setLoadingMembers(true);
      Promise.all([
        getWorkspaceMembers(activeWorkspace.id).then(setMembers).catch(() => toast.error("Failed to load members")),
        getPendingInvitesForWorkspace(activeWorkspace.id).then(setPendingInvites).catch(() => toast.error("Failed to load invites")),
      ]).finally(() => setLoadingMembers(false));
      refreshStats(activeWorkspace.id);
    }
  }, [activeTab, activeWorkspace, refreshStats]);

  const handleSaveName = async () => {
    if (!activeWorkspace) return;
    const trimmed = workspaceName.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error("Workspace name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    try {
      await updateWorkspaceName(activeWorkspace.id, trimmed);
      toast.success("Workspace name updated");
      refreshWorkspaces();
    } catch {
      toast.error("Failed to update workspace name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmed = profileName.trim();
    if (!trimmed || trimmed.length < 1) {
      toast.error("Display name cannot be empty");
      return;
    }
    if (trimmed.length > 50) {
      toast.error("Display name must be 50 characters or less");
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile(user.id, {
        displayName: trimmed,
        photoURL: profilePhotoURL.trim() || null,
      });
      toast.success("Profile updated");
      refreshWorkspaces();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInvite = async () => {
    if (!activeWorkspace || !firebaseUser || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setInviting(true);
    try {
      const authHeaders = await getApiAuthHeaders(activeWorkspace.id);
      const res = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle known enterprise error codes
        if (data.code === "duplicate_pending") {
          toast.error("An invitation has already been sent to this email. You can resend it from the pending invites list.");
          // Refresh to show the existing pending invite
          const updated = await getPendingInvitesForWorkspace(activeWorkspace.id);
          setPendingInvites(updated);
        } else {
          toast.error(data.error || "Failed to send invite");
        }
        return;
      }

      toast.success(
        data.emailSent
          ? `Invite sent to ${inviteEmail}`
          : `Invite created for ${inviteEmail} (email sending not configured)`
      );
      setInviteEmail("");
      // Refresh pending invites list
      const updated = await getPendingInvitesForWorkspace(activeWorkspace.id);
      setPendingInvites(updated);
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!activeWorkspace) return;
    if (processingInvites.has(inviteId)) return;
    setProcessingInvites((prev) => new Set(prev).add(inviteId));
    try {
      await cancelInvite(inviteId);
      toast.success(`Invite to ${email} cancelled`);
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      toast.error("Failed to cancel invite");
    } finally {
      setProcessingInvites((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  const handleResendInvite = async (invite: WorkspaceInvite) => {
    if (!activeWorkspace || !firebaseUser) return;
    if (processingInvites.has(invite.id)) return;
    setProcessingInvites((prev) => new Set(prev).add(invite.id));
    toast.info("Resending invitation...");
    try {
      const authHeaders = await getApiAuthHeaders(activeWorkspace.id);
      const res = await fetch("/api/workspaces/invite/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ inviteId: invite.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "resend_cooldown") {
          toast.error(data.error);
        } else {
          toast.error(data.error || "Failed to resend invitation");
        }
        return;
      }

      toast.success(
        data.emailSent
          ? `Invitation re-sent to ${invite.email}`
          : `Invitation re-sent to ${invite.email} (email sending not configured)`
      );

      // Refresh pending invites list to get updated expiry
      if (activeWorkspace) {
        const updated = await getPendingInvitesForWorkspace(activeWorkspace.id);
        setPendingInvites(updated);
      }
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setProcessingInvites((prev) => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace || !firebaseUser) return;
    try {
      await removeMemberFromWorkspace(activeWorkspace.id, memberId, firebaseUser.uid);
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    if (!activeWorkspace || !firebaseUser) return;
    try {
      await updateMemberRole(activeWorkspace.id, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === memberId ? { ...m, role: newRole } : m
        )
      );
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspace || !firebaseUser) return;
    setLeaving(true);
    try {
      await leaveWorkspace(activeWorkspace.id, firebaseUser.uid);
      toast.success("Left workspace");

      // Switch to another workspace if available
      const remaining = workspaces.filter((w) => w.id !== activeWorkspace.id);
      if (remaining.length > 0) {
        await switchWorkspace(remaining[0].id);
      } else {
        window.location.href = "/dashboard";
      }
      refreshWorkspaces();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave workspace");
    } finally {
      setLeaving(false);
      setLeaveDialogOpen(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace || !firebaseUser) return;
    setDeleting(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      toast.success("Workspace deleted");

      const remaining = workspaces.filter((w) => w.id !== activeWorkspace.id);
      if (remaining.length > 0) {
        await switchWorkspace(remaining[0].id);
      } else {
        window.location.href = "/dashboard";
      }
      refreshWorkspaces();
    } catch {
      toast.error("Failed to delete workspace");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  const isAdminOrOwner = user?.role === "owner" || user?.role === "admin";

  // Dashboard and Settings access is controlled by frontend guards (nav filtering + route guards),
  // not by module permissions - so exclude them from the toggle grid
  const controlledModuleIds: ModuleId[] = ["leads", "projects", "time_tracker", "meetings", "messages", "invoices", "clients"];

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "profile", label: "Profile", icon: <UserCircle className="h-4 w-4" /> },
    { id: "workspace", label: "Workspace", icon: <Building2 className="h-4 w-4" />, adminOnly: true },
    { id: "members", label: "Members & Permissions", icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: "client-portal", label: "Client Portal", icon: <UserCheck className="h-4 w-4" />, adminOnly: true },
    { id: "preferences", label: "Preferences", icon: <Settings className="h-4 w-4" /> },
    { id: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
  ];

  const tabs = allTabs.filter((tab) => !tab.adminOnly || isAdminOrOwner);

  return (
    <RequireModuleAccess moduleId="settings">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); router.replace(`/settings?tab=${tab.id}`, { scroll: false }); }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {isAdminOrOwner && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => router.push("/settings/audit-log")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Audit Log
            </Button>
          )}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Your personal profile information across all workspaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2">
                      <AvatarImage src={profilePhotoURL || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {(profileName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{profileName || "Your Name"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="profile-name">Display Name</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how your name appears across the application to other workspace members.
                  </p>
                </div>

                {/* Photo URL */}
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="profile-photo">Photo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile-photo"
                      value={profilePhotoURL}
                      onChange={(e) => setProfilePhotoURL(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide a URL to your profile image. Leave empty to show initials.
                  </p>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2 max-w-md">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address is managed through Firebase Authentication and cannot be changed here.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={resettingPwd}
                    className="mt-1"
                  >
                    {resettingPwd ? "Sending..." : "Reset Password"}
                  </Button>
                </div>

                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workspace Tab */}
        {activeTab === "workspace" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Name</CardTitle>
                <CardDescription>
                  This is the name of your workspace as it appears across the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    maxLength={50}
                    className="max-w-md"
                  />
                  <Button onClick={handleSaveName} disabled={savingName}>
                    {savingName ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isOwner ? (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                    <div>
                      <p className="font-medium">Delete Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this workspace and all its data.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                    <div>
                      <p className="font-medium">Leave Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Remove yourself from this workspace.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setLeaveDialogOpen(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Leave
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Member</CardTitle>
                <CardDescription>
                  Send an invite to a team member by email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={inviteRole} onValueChange={(v: "admin" | "member" | "viewer") => setInviteRole(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInvite} disabled={inviting}>
                    {inviting ? "Sending..." : "Invite"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members ({members.length})</CardTitle>
                <CardDescription>
                  People who have access to this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No members yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={member.photoURL || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {member.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {member.displayName || "Unknown"}
                              </p>
                              {member.userId === activeWorkspace.ownerId && (
                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </span>
                              )}
                              {member.userId === user?.id && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && member.userId !== activeWorkspace.ownerId ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize hover:bg-muted/80">
                                  {member.role}
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member.userId, "admin")}
                                >
                                  <Crown className="mr-2 h-3.5 w-3.5" />
                                  Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member.userId, "member")}
                                >
                                  <Users className="mr-2 h-3.5 w-3.5" />
                                  Member
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(member.userId, "viewer")}
                                >
                                  <Shield className="mr-2 h-3.5 w-3.5" />
                                  Viewer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(member.userId)}
                                >
                                  Remove from workspace
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Pending Invites ({pendingInvites.length})
                  </CardTitle>
                  <CardDescription>
                    Invitations that haven&apos;t been accepted yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                              <Mail className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{invite.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Role: {invite.role} &middot; Expires {invite.expiresAt.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={processingInvites.has(invite.id)}
                            onClick={() => handleResendInvite(invite)}
                          >
                            {processingInvites.has(invite.id) ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={processingInvites.has(invite.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                            onClick={() => handleCancelInvite(invite.id, invite.email)}
                          >
                            {processingInvites.has(invite.id) ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions
                </CardTitle>
                <CardDescription>
                  Control which modules each role can access. Owners and Admins always have full access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isOwner ? (
                  <div className="space-y-4">
                    {(["member", "viewer"] as const).map((role) => {
                      const perms = getEffectivePermissions(
                        activeWorkspace?.modulePermissions || null,
                        role
                      );
                      return (
                        <div key={role}>
                          <p className="text-sm font-medium capitalize mb-2 text-muted-foreground">{role}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {controlledModuleIds.map((mod) => (
                              <div key={mod} className="flex items-center gap-2 text-sm py-1">
                                <div
                                  className={`h-2 w-2 rounded-full ${perms[mod] ? "bg-green-500" : "bg-red-400"}`}
                                />
                                <span className={!perms[mod] ? "text-muted-foreground line-through" : ""}>
                                  {MODULE_LABELS[mod]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(["member", "viewer"] as const).map((role) => (
                      <div key={role} className="space-y-3">
                        <p className="text-sm font-medium capitalize text-muted-foreground">
                          {role === "member" ? "Member" : "Viewer"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {controlledModuleIds.map((mod) => {
                            const isEnabled = modulePermissions[role]?.[mod] ?? false;
                            return (
                              <label
                                key={mod}
                                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${isEnabled
                                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                    : "bg-muted/30 border-border hover:bg-muted/50"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleToggleModule(role, mod)}
                                  className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                <span className={`text-sm ${!isEnabled ? "text-muted-foreground" : "font-medium"}`}>
                                  {MODULE_LABELS[mod]}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleSavePermissions}
                        disabled={savingPermissions}
                      >
                        {savingPermissions ? "Saving..." : "Save Permissions"}
                      </Button>
                      <Button variant="outline" onClick={handleResetPermissions}>
                        Reset to Default
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            {/* Accent Theme Picker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Accent Color
                </CardTitle>
                <CardDescription>
                  Choose a primary accent color for the interface. Applied instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-9">
                  {ACCENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAccent(option.value as AccentColor)}
                      className="group relative flex flex-col items-center gap-1.5"
                      title={option.label}
                    >
                      <div
                        className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-transform hover:scale-110"
                        style={{ backgroundColor: option.hex }}
                      >
                        {accent === option.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        )}
                        {accent === option.value && (
                          <span className="absolute -inset-0.5 rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>
                  Configure timezone, currency, and date format for this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue={activeWorkspace.timezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                          {Intl.DateTimeFormat().resolvedOptions().timeZone}
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Karachi">Karachi</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select defaultValue={activeWorkspace.currency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select defaultValue={activeWorkspace.dateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week Starts On</Label>
                    <Select defaultValue={activeWorkspace.weekStart}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button disabled>
                  Save Preferences
                </Button>
                <p className="text-xs text-muted-foreground">
                  Regional settings will be fully editable in the next update.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <CalendarConnection />
          </div>
        )}

        {/* Client Portal Tab */}
        {activeTab === "client-portal" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Client Portal Settings
                </CardTitle>
                <CardDescription>
                  Configure what clients see and can do in their portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage portal visibility, module access, welcome card, checklist, and more.
                </p>
                <Button asChild>
                  <Link href="/settings/client-portal">
                    <Settings className="mr-2 h-4 w-4" />
                    Open Client Portal Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave Dialog */}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Workspace</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave &quot;{activeWorkspace.name}&quot;?
                You will lose access to all leads, pipelines, and data in this workspace.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLeaveWorkspace} disabled={leaving}>
                {leaving ? "Leaving..." : "Leave Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Workspace</DialogTitle>
              <DialogDescription>
                This will permanently delete &quot;{activeWorkspace.name}&quot; and all its data.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireModuleAccess>
  );
}
