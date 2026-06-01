"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientUser } from "@/contexts/client-user-context";
import { db } from "@/lib/firebase/client";
import type { ClientPortalSettings } from "@/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Building2,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  LogOut,
  Mail,
  MessageSquare,
  Receipt,
  Save,
  Settings,
  ShieldAlert,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/client/module-layout";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  projects: <FolderKanban className="h-5 w-5" />,
  messages: <MessageSquare className="h-5 w-5" />,
  meetings: <Calendar className="h-5 w-5" />,
  invoices: <Receipt className="h-5 w-5" />,
  documents: <FileText className="h-5 w-5" />,
  time_tracking: <Clock className="h-5 w-5" />,
  project_requests: <ClipboardList className="h-5 w-5" />,
};

const MODULE_LABELS: Record<string, string> = {
  projects: "Projects",
  messages: "Messages",
  meetings: "Meetings",
  invoices: "Invoices",
  documents: "Documents",
  time_tracking: "Time Tracking",
  project_requests: "Project Requests",
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  projects: "View and track your project progress",
  messages: "Communicate with your project team",
  meetings: "Schedule and join meetings",
  invoices: "View and manage your invoices",
  documents: "Access shared files and resources",
  time_tracking: "Track billable hours and time",
  project_requests: "Submit new project requests",
};

export default function ClientSettingsPage() {
  const {
    uid,
    displayName: initialName,
    email,
    photoURL,
    clientWorkspaceId,
    workspaceName,
  } = useClientUser();

  const [displayName, setDisplayName] = useState(initialName);
  const [portalSettings, setPortalSettings] = useState<ClientPortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberSince, setMemberSince] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (!clientWorkspaceId || !uid) return;
    const fetchData = async () => {
      try {
        const [settingsSnap, userSnap] = await Promise.all([
          getDoc(doc(db, "client_portal_settings", clientWorkspaceId)),
          getDoc(doc(db, "users", uid)),
        ]);

        if (settingsSnap.exists()) {
          setPortalSettings(settingsSnap.data() as ClientPortalSettings);
        } else {
          setPortalSettings(DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings);
        }

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.createdAt?.toDate) {
            setMemberSince(userData.createdAt.toDate());
          }
        }
      } catch {
        setPortalSettings(DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientWorkspaceId, uid]);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, "users", uid), {
        displayName: displayName.trim(),
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently fail — user can retry
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
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      {/* ── Profile ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2">
              <AvatarImage src={photoURL || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {displayName?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold">{displayName}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{email}</span>
                <Badge variant="secondary" className="text-[10px] leading-none">
                  <Mail className="h-3 w-3 mr-0.5 inline" />
                  Verified
                </Badge>
              </div>
              {memberSince && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Member since {formatDate(memberSince)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
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
                className="gap-2"
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Workspace</p>
              <p className="text-sm text-muted-foreground">{workspaceName}</p>
            </div>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Your Role</p>
              <p className="text-sm text-muted-foreground">Client portal access</p>
            </div>
            <Badge variant="outline" className="capitalize shrink-0">
              Client
            </Badge>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">{formatDate(memberSince)}</p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Portal Features ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Portal Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : portalSettings ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(MODULE_LABELS).map(([key, label]) => {
                const enabled =
                  portalSettings.modules[key as keyof typeof portalSettings.modules] !== false;
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                      enabled ? "hover:bg-accent/50" : "opacity-60"
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                        enabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {MODULE_ICONS[key]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        {enabled ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] leading-none border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 shrink-0"
                          >
                            Enabled
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] leading-none shrink-0"
                          >
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {MODULE_DESCRIPTIONS[key]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Portal settings not configured. Contact your agency for assistance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Remove Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove your account from this workspace. This action cannot be undone.
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
