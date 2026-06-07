"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientPortal } from "@/contexts/client-portal-context";
import { useClientUser } from "@/contexts/client-user-context";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Building2,
  Calendar,
  Check,
  File,
  FileText,
  FolderKanban,
  LogOut,
  Mail,
  MessageSquare,
  Save,
  ShieldAlert,
  User,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/client/module-layout";

// ─── Module Display Config ───────────────────────────────────────────────────

const MODULE_DISPLAY: Record<
  string,
  { label: string; description: string; icon: React.ReactNode }
> = {
  projects: {
    label: "Projects",
    description: "View and track project progress",
    icon: <FolderKanban className="h-4 w-4" />,
  },
  messages: {
    label: "Messages",
    description: "Chat with workspace team members",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  meetings: {
    label: "Meetings",
    description: "Schedule and join video meetings",
    icon: <Video className="h-4 w-4" />,
  },
  invoices: {
    label: "Invoices",
    description: "View and manage invoices",
    icon: <FileText className="h-4 w-4" />,
  },
  documents: {
    label: "Documents",
    description: "Access shared files and documents",
    icon: <File className="h-4 w-4" />,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientSettingsPage() {
  const {
    uid,
    displayName: initialName,
    email,
    photoURL: initialPhoto,
    clientWorkspaceId,
    workspaceName,
  } = useClientUser();
  const { settings, isModuleEnabled, isPortalEnabled } = useClientPortal();

  const [displayName, setDisplayName] = useState(initialName);
  const [photoURL, setPhotoURL] = useState(initialPhoto);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberSince, setMemberSince] = useState<Date | null>(null);

  useEffect(() => {
    setDisplayName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.createdAt?.toDate) {
          setMemberSince(userData.createdAt.toDate());
        }
      }
    });
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, "users", uid), {
        displayName: displayName.trim(),
        photoURL: photoURL || null,
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      {/* ── Profile ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information on this workspace</CardDescription>
            </div>
          </div>
        </CardHeader>
          <CardContent className="space-y-6">
          {/* Avatar + Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="h-20 w-20 border-2 shrink-0">
              <AvatarImage src={photoURL || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {displayName?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5 min-w-0">
              <p className="text-lg font-semibold truncate">{displayName}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{email}</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] leading-none h-5"
                >
                  <Mail className="h-3 w-3 mr-0.5 inline" />
                  Verified
                </Badge>
              </div>
              {memberSince && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Member since {formatDate(memberSince)}
                </p>
              )}
            </div>
          </div>

          {/* Photo Upload */}
          {clientWorkspaceId && (
            <div className="flex items-center gap-3">
              <ImageUpload
                currentUrl={photoURL || null}
                endpoint="/api/upload/avatar"
                workspaceId={clientWorkspaceId}
                onUploaded={(url) => {
                  setPhotoURL(url);
                  // Persist immediately
                  updateDoc(doc(db, "users", uid), {
                    photoURL: url || null,
                    updatedAt: new Date(),
                  }).catch(() => {});
                }}
                label="Upload Photo"
              />
              <p className="text-xs text-muted-foreground">
                Upload a profile image. Leave empty to show initials.
              </p>
            </div>
          )}

          <Separator />

          {/* Display Name Editor */}
          <div className="space-y-2 max-w-md">
            <Label htmlFor="displayName">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="gap-2 shrink-0"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : saving ? (
                  <Skeleton className="h-4 w-4" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Account ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your workspace and role information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium">Workspace</p>
              <p className="text-sm text-muted-foreground truncate">{workspaceName}</p>
            </div>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium">Your Role</p>
              <p className="text-sm text-muted-foreground">Client portal access</p>
            </div>
            <Badge variant="outline" className="capitalize shrink-0 ml-4">
              Client
            </Badge>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">{formatDate(memberSince)}</p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Portal Features (read-only) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Portal Features</CardTitle>
                <CardDescription>
                  Modules enabled by your workspace {isPortalEnabled ? "" : "(portal disabled)"}
                </CardDescription>
              </div>
            </div>
            {!isPortalEnabled && (
              <Badge variant="destructive" className="shrink-0">
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(MODULE_DISPLAY).map(([key, mod]) => {
              const enabled = isModuleEnabled(key as keyof typeof settings.modules);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    enabled
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/30 border-border opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${
                      enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {mod.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{mod.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mod.description}
                    </p>
                  </div>
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      enabled ? "bg-green-500" : "bg-red-400"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          {!isPortalEnabled && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              The client portal has been disabled by your workspace. Contact your workspace
              admin for access.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Remove Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove your account from this workspace. You will lose access to
                  all projects, messages, and documents.
                </p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2 shrink-0">
                <LogOut className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
