"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccent, ACCENT_OPTIONS, type AccentColor } from "@/contexts/accent-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Trash2,
  LogOut,
  Shield,
  Crown,
  KanbanSquare,
  ListFilter,
  UserCog,
  Pencil,
  Plug,
  Mail,
  Clock,
  XCircle,
  Check,
  Palette,
  UserCircle,
  Camera,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  updateWorkspaceName,
  updateWorkspace,
  getWorkspaceMembers,
  removeMemberFromWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  createInvite,
  cancelInvite,
  getPendingInvitesForWorkspace,
  updateMemberRole,
} from "@/lib/firebase/workspaces";
import { renderInviteEmail } from "@/lib/email-templates";
import type { WorkspaceMember, WorkspaceInvite, PipelineStage, CustomField } from "@/types";

// Dynamically loaded tab content — only loaded when user clicks the tab
const PipelineEditor = dynamic(() => import("@/components/settings/pipeline-editor").then((mod) => mod.PipelineEditor), {
  loading: () => <div className="p-8 animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-24 bg-muted rounded" /></div>,
});

const CustomFieldsEditor = dynamic(() => import("@/components/settings/custom-fields-editor").then((mod) => mod.CustomFieldsEditor), {
  loading: () => <div className="p-8 animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-24 bg-muted rounded" /></div>,
});

const CalendarConnection = dynamic(() => import("@/components/settings/calendar-connection").then((mod) => mod.CalendarConnection), {
  loading: () => <div className="p-8 animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-24 bg-muted rounded" /></div>,
});
import { updateUserProfile } from "@/lib/firebase/users";
import { useLeadStore } from "@/lib/stores/leadStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

type Tab = "profile" | "workspace" | "members" | "pipeline" | "custom-fields" | "preferences" | "integrations";

export default function SettingsPage() {
  const { user, activeWorkspace, workspaces, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Check if navigated from sidebar user profile click
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leadflow_settings_tab");
      if (saved === "profile") {
        localStorage.removeItem("leadflow_settings_tab");
        return "profile";
      }
    }
    return "workspace";
  });
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<(WorkspaceInvite & { id: string })[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState(user?.displayName || "");
  const [profilePhotoURL, setProfilePhotoURL] = useState(user?.photoURL || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const isOwner = activeWorkspace?.ownerId === user?.id;
  const { stats, refreshStats } = useLeadStore();
  const { accent, setAccent } = useAccent();
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setPipelineStages(activeWorkspace.pipeline?.stages || []);
      setCustomFields(activeWorkspace.customFields || []);
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
    }
    if (activeTab === "pipeline" && activeWorkspace) {
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
      const inviteId = await createInvite(activeWorkspace.id, inviteEmail.trim(), firebaseUser.uid, inviteRole);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const acceptUrl = `${baseUrl}/invite/accept?inviteId=${inviteId}`;
      const workspaceName = activeWorkspace.name;
      const inviterName = user?.displayName || "A team member";

      // Send actual invitation email via Resend
      const html = renderInviteEmail({
        inviterName,
        workspaceName,
        inviteRole,
        acceptUrl,
      });

      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inviteEmail.trim(),
          subject: `Join ${workspaceName} on LeadFlow CRM`,
          html,
          workspaceId: activeWorkspace.id,
          createdBy: firebaseUser.uid,
        }),
      });

      toast.success(`Invite sent to ${inviteEmail}`);
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
    try {
      await cancelInvite(inviteId);
      toast.success(`Invite to ${email} cancelled`);
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      toast.error("Failed to cancel invite");
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

  const handleSavePipeline = async (stages: PipelineStage[]) => {
    if (!activeWorkspace) return;
    setSavingPipeline(true);
    try {
      await updateWorkspace(activeWorkspace.id, {
        pipeline: { stages },
      });
      setPipelineStages(stages);
      refreshWorkspaces();
    } catch {
      toast.error("Failed to save pipeline stages");
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleSaveCustomFields = async (fields: CustomField[]) => {
    if (!activeWorkspace) return;
    try {
      await updateWorkspace(activeWorkspace.id, { customFields: fields });
      setCustomFields(fields);
      refreshWorkspaces();
    } catch {
      toast.error("Failed to save custom fields");
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Manage your workspace and preferences." />
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <UserCircle className="h-4 w-4" /> },
    { id: "workspace", label: "Workspace", icon: <Building2 className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "pipeline", label: "Pipeline", icon: <KanbanSquare className="h-4 w-4" /> },
    { id: "custom-fields", label: "Custom Fields", icon: <ListFilter className="h-4 w-4" /> },
    { id: "preferences", label: "Preferences", icon: <Shield className="h-4 w-4" /> },
    { id: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your workspace and preferences." />

      {/* Tab Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={() => router.push("/settings/audit-log")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Audit Log
        </Button>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelInvite(invite.id, invite.email)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Role Permissions
              </CardTitle>
              <CardDescription>
                What each role can do in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-medium text-muted-foreground">Permission</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Owner</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Admin</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Member</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["View leads", true, true, true, true],
                      ["Create leads", true, true, true, false],
                      ["Edit leads", true, true, true, false],
                      ["Delete leads", true, true, false, false],
                      ["View analytics", true, true, true, true],
                      ["Export data", true, true, true, false],
                      ["Manage pipeline", true, true, false, false],
                      ["Manage custom fields", true, true, false, false],
                      ["Manage members", true, true, false, false],
                      ["Delete workspace", true, false, false, false],
                    ].map(([permission, owner, admin, member, viewer]) => (
                      <tr key={permission as string} className="hover:bg-muted/20">
                        <td className="py-2.5">{permission as string}</td>
                        <td className="py-2.5 text-center">{(owner as boolean) ? "✓" : "—"}</td>
                        <td className="py-2.5 text-center">{(admin as boolean) ? "✓" : "—"}</td>
                        <td className="py-2.5 text-center">{(member as boolean) ? "✓" : "—"}</td>
                        <td className="py-2.5 text-center">{(viewer as boolean) ? "✓" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <PipelineEditor
            stages={pipelineStages}
            leadCounts={stats.byStatus}
            onSave={handleSavePipeline}
          />
        </div>
      )}

      {/* Custom Fields Tab */}
      {activeTab === "custom-fields" && (
        <div className="space-y-6">
          <CustomFieldsEditor
            fields={customFields}
            onSave={handleSaveCustomFields}
          />
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
  );
}
