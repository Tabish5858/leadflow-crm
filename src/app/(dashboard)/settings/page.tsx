"use client";

import { useState, useEffect } from "react";
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
  Copy,
  Trash2,
  LogOut,
  Shield,
  Crown,
  MoreHorizontal,
  KanbanSquare,
  ListFilter,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  updateWorkspaceName,
  updateWorkspace,
  getWorkspaceMembers,
  removeMemberFromWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  regenerateInviteCode,
  createInvite,
} from "@/lib/firebase/workspaces";
import type { WorkspaceMember, PipelineStage, CustomField } from "@/types";
import { PipelineEditor } from "@/components/settings/pipeline-editor";
import { CustomFieldsEditor } from "@/components/settings/custom-fields-editor";
import { useLeadStore } from "@/lib/stores/leadStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab = "workspace" | "members" | "pipeline" | "custom-fields" | "preferences";

export default function SettingsPage() {
  const { user, activeWorkspace, workspaces, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const { firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("workspace");
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = activeWorkspace?.ownerId === user?.id;
  const { stats, refreshStats } = useLeadStore();
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setInviteCode(activeWorkspace.inviteCode || "");
      setPipelineStages(activeWorkspace.pipeline?.stages || []);
      setCustomFields(activeWorkspace.customFields || []);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (activeTab === "members" && activeWorkspace) {
      setLoadingMembers(true);
      getWorkspaceMembers(activeWorkspace.id)
        .then(setMembers)
        .catch(() => toast.error("Failed to load members"))
        .finally(() => setLoadingMembers(false));
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

  const handleCopyInviteCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied to clipboard");
  };

  const handleRegenerateCode = async () => {
    if (!activeWorkspace) return;
    try {
      const newCode = await regenerateInviteCode(activeWorkspace.id);
      setInviteCode(newCode);
      toast.success("New invite code generated");
    } catch {
      toast.error("Failed to regenerate invite code");
    }
  };

  const handleInvite = async () => {
    if (!activeWorkspace || !firebaseUser || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setInviting(true);
    try {
      await createInvite(activeWorkspace.id, inviteEmail.trim(), firebaseUser.uid, inviteRole);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
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
    { id: "workspace", label: "Workspace", icon: <Building2 className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "pipeline", label: "Pipeline", icon: <KanbanSquare className="h-4 w-4" /> },
    { id: "custom-fields", label: "Custom Fields", icon: <ListFilter className="h-4 w-4" /> },
    { id: "preferences", label: "Preferences", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your workspace and preferences." />

      {/* Tab Navigation */}
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

          <Card>
            <CardHeader>
              <CardTitle>Invite Code</CardTitle>
              <CardDescription>
                Share this code with team members so they can join your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <code className="rounded-md bg-muted px-4 py-2 text-lg font-mono font-bold tracking-wider">
                  {inviteCode || "N/A"}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateCode}>
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Invite codes expire after 7 days. Regenerating will invalidate the old code.
              </p>
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
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                          {member.role}
                        </span>
                        {isOwner && member.userId !== activeWorkspace.ownerId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                Remove from workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
