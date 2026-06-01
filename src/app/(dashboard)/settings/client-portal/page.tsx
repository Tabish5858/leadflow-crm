"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { useWorkspace } from "@/contexts/workspace-context";
import { db } from "@/lib/firebase/client";
import { useClientPreview } from "@/lib/hooks/use-client-preview";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ClientPortalSettings } from "@/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/types";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  GripVertical,
  Eye,
  Link as LinkIcon,
  File,
  Plus,
  Trash2,
  Save,
  Settings,
  ToggleLeft,
  MessageSquare,
  FolderKanban,
  Calendar,
  FileText,
  Clock,
  Users,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { nanoid } from "nanoid";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────

interface ModuleConfig {
  key: keyof ClientPortalSettings["modules"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const MODULES: ModuleConfig[] = [
  {
    key: "projects",
    label: "Projects",
    icon: FolderKanban,
    description: "Allow clients to view and track project progress",
  },
  {
    key: "messages",
    label: "Messages",
    icon: MessageSquare,
    description: "Enable direct messaging between clients and your team",
  },
  {
    key: "meetings",
    label: "Meetings",
    icon: Calendar,
    description: "Let clients view scheduled meetings and join video calls",
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: FileText,
    description: "Show invoices, payment status, and history to clients",
  },
  {
    key: "documents",
    label: "Documents",
    icon: File,
    description: "Share documents and files with clients",
  },
  {
    key: "time_tracking",
    label: "Time Tracking",
    icon: Clock,
    description: "Display logged time entries for client projects",
  },
  {
    key: "project_requests",
    label: "Project Requests",
    icon: Users,
    description: "Allow clients to submit new project requests",
  },
];

interface PortalSettingsForm {
  enabled: boolean;
  modules: ClientPortalSettings["modules"];
  welcomeCard: ClientPortalSettings["welcomeCard"];
  checklist: ClientPortalSettings["checklist"];
  helpfulLinks: ClientPortalSettings["helpfulLinks"];
  helpfulFiles: ClientPortalSettings["helpfulFiles"];
}

const DEFAULT_FORM: PortalSettingsForm = {
  enabled: true,
  modules: DEFAULT_CLIENT_PORTAL_SETTINGS.modules ?? {
    projects: true,
    messages: true,
    meetings: true,
    invoices: true,
    documents: true,
    time_tracking: true,
    project_requests: true,
  },
  welcomeCard: DEFAULT_CLIENT_PORTAL_SETTINGS.welcomeCard ?? {
    title: "Welcome to the Client Portal",
    description:
      "We're excited to have you onboard. Here you can track your projects, communicate with our team, and manage everything in one place.",
    bulletPoints: [
      "View real-time project progress and updates",
      "Send and receive messages with your project team",
      "Access shared documents and resources",
    ],
    mediaUrl: null,
    mediaType: null,
    showOnFirstVisitOnly: true,
    enabled: true,
  },
  checklist: DEFAULT_CLIENT_PORTAL_SETTINGS.checklist ?? {
    enabled: true,
    steps: [],
  },
  helpfulLinks: [],
  helpfulFiles: [],
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function ClientPortalSettingsPage() {
  const { user, activeWorkspace } = useWorkspace();
  const { enterPreview } = useClientPreview();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PortalSettingsForm>(DEFAULT_FORM);
  const [initializing, setInitializing] = useState(false);

  const workspaceId = activeWorkspace?.id;
  const isAdminOrOwner =
    user?.role === "owner" || user?.role === "admin";

  // ─── Load Settings ─────────────────────────────────────────────────────

  const [refreshKey, setRefreshKey] = useState(0);
  const loadSettings = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "client_portal_settings", workspaceId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as ClientPortalSettings & {
            enabled?: boolean;
          };
          setSettings({
            ...DEFAULT_FORM,
            ...data,
            enabled: data.enabled ?? true,
          });
        } else {
          setSettings(DEFAULT_FORM);
        }
      } catch {
        setError("Failed to load settings");
        toast.error("Failed to load client portal settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [workspaceId, refreshKey]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleMasterToggle = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, enabled: checked }));
  };

  const handleModuleToggle = (key: keyof ClientPortalSettings["modules"]) => {
    setSettings((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: !prev.modules[key] },
    }));
  };

  // Welcome Card
  const updateWelcomeCard = (
    updates: Partial<PortalSettingsForm["welcomeCard"]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      welcomeCard: { ...prev.welcomeCard, ...updates },
    }));
  };

  const handleAddBulletPoint = () => {
    setSettings((prev) => ({
      ...prev,
      welcomeCard: {
        ...prev.welcomeCard,
        bulletPoints: [...prev.welcomeCard.bulletPoints, ""],
      },
    }));
  };

  const handleBulletPointChange = (idx: number, value: string) => {
    setSettings((prev) => {
      const updated = [...prev.welcomeCard.bulletPoints];
      updated[idx] = value;
      return {
        ...prev,
        welcomeCard: { ...prev.welcomeCard, bulletPoints: updated },
      };
    });
  };

  const handleRemoveBulletPoint = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      welcomeCard: {
        ...prev.welcomeCard,
        bulletPoints: prev.welcomeCard.bulletPoints.filter(
          (_, i) => i !== idx
        ),
      },
    }));
  };

  // Checklist
  const handleChecklistToggle = (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, enabled: checked },
    }));
  };

  const handleStepChange = (
    idx: number,
    key: "title" | "description" | "videoUrl" | "actionLabel" | "actionUrl",
    value: string
  ) => {
    setSettings((prev) => {
      const updated = [...prev.checklist.steps];
      updated[idx] = {
        ...updated[idx],
        [key]: value === "" && key !== "title" && key !== "description"
          ? null
          : value,
      };
      return {
        ...prev,
        checklist: { ...prev.checklist, steps: updated },
      };
    });
  };

  const handleAddStep = () => {
    setSettings((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        steps: [
          ...prev.checklist.steps,
          {
            id: nanoid(),
            title: "",
            description: "",
            videoUrl: null,
            actionLabel: null,
            actionUrl: null,
            order: prev.checklist.steps.length,
          },
        ],
      },
    }));
  };

  const handleRemoveStep = (idx: number) => {
    setSettings((prev) => {
      const remaining = prev.checklist.steps.filter((_, i) => i !== idx);
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          steps: remaining.map((step, i) => ({ ...step, order: i })),
        },
      };
    });
  };

  // Helpful Links
  const handleLinkChange = (
    idx: number,
    key: "title" | "url",
    value: string
  ) => {
    setSettings((prev) => {
      const updated = [...prev.helpfulLinks];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, helpfulLinks: updated };
    });
  };

  const handleAddLink = () => {
    setSettings((prev) => ({
      ...prev,
      helpfulLinks: [
        ...prev.helpfulLinks,
        { id: nanoid(), title: "", url: "", order: prev.helpfulLinks.length },
      ],
    }));
  };

  const handleRemoveLink = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      helpfulLinks: prev.helpfulLinks
        .filter((_, i) => i !== idx)
        .map((link, i) => ({ ...link, order: i })),
    }));
  };

  // Helpful Files
  const handleFileChange = (
    idx: number,
    key: "title" | "fileUrl",
    value: string
  ) => {
    setSettings((prev) => {
      const updated = [...prev.helpfulFiles];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, helpfulFiles: updated };
    });
  };

  const handleAddFile = () => {
    setSettings((prev) => ({
      ...prev,
      helpfulFiles: [
        ...prev.helpfulFiles,
        {
          id: nanoid(),
          title: "",
          fileUrl: "",
          fileSize: 0,
          mimeType: "",
        },
      ],
    }));
  };

  const handleRemoveFile = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      helpfulFiles: prev.helpfulFiles.filter((_, i) => i !== idx),
    }));
  };

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!workspaceId || !user) return;
    setSaving(true);
    try {
      const ref = doc(db, "client_portal_settings", workspaceId);
      const { enabled, ...rest } = settings;
      await setDoc(ref, {
        ...rest,
        enabled,
        updatedAt: serverTimestamp(),
        updatedBy: user.id,
      });
      toast.success("Client portal settings saved");
    } catch (err) {
      console.error("Failed to save portal settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ─── Create Default ────────────────────────────────────────────────────

  const handleCreateDefault = async () => {
    if (!workspaceId) return;
    setInitializing(true);
    try {
      const res = await fetch("/api/init-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to initialize portal");
      toast.success("Default settings created");
      await loadSettings();
    } catch {
      toast.error("Failed to create default settings");
    } finally {
      setInitializing(false);
    }
  };

  // ─── Permission Denied ─────────────────────────────────────────────────

  if (!isAdminOrOwner) {
    return (
      <RequireModuleAccess moduleId="settings">
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            You don&apos;t have permission to access this page. Only owners
            and admins can configure client portal settings.
          </p>
          <Button asChild variant="outline">
            <NextLink href="/dashboard/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </NextLink>
          </Button>
        </div>
      </RequireModuleAccess>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <RequireModuleAccess moduleId="settings">
        <div className="space-y-6 pb-24">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RequireModuleAccess>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <RequireModuleAccess moduleId="settings">
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            {error}
          </p>
          <Button onClick={loadSettings}>Retry</Button>
        </div>
      </RequireModuleAccess>
    );
  }

  // ─── Empty State (no doc in Firestore) ─────────────────────────────────

  if (!settings) {
    return (
      <RequireModuleAccess moduleId="settings">
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <div className="rounded-full bg-muted p-4 mb-6">
            <Settings className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            No settings found
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Client portal settings haven&apos;t been initialized for this
            workspace yet. Create default settings to get started.
          </p>
          <Button onClick={handleCreateDefault} disabled={initializing}>
            {initializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Default Settings"
            )}
          </Button>
        </div>
      </RequireModuleAccess>
    );
  }

  // ─── Main Content ──────────────────────────────────────────────────────

  return (
    <RequireModuleAccess moduleId="settings">
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <NextLink href="/dashboard/settings">
                  <ArrowLeft className="h-4 w-4" />
                </NextLink>
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">
                Client Portal Settings
              </h1>
            </div>
            <p className="text-sm text-muted-foreground pl-10">
              Configure what clients see and can do in their portal.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => {
              // Save current draft settings to sessionStorage for preview
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  "leadflow_client_portal_preview_settings",
                  JSON.stringify(settings)
                );
              }
              enterPreview("preview-client", "Preview Client");
              router.push("/client/dashboard");
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Portal
          </Button>
        </div>

        <Separator />

        {/* Master Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  Enable Client Portal
                </CardTitle>
                <CardDescription>
                  When disabled, clients will see a maintenance page instead
                  of the portal.
                </CardDescription>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleMasterToggle}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Disabled Warning */}
        {!settings.enabled && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                The client portal is currently disabled. Clients will not be
                able to access their dashboard until you enable it.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dimmed content when disabled */}
        <div
          className={cn(
            "space-y-6",
            !settings.enabled &&
              "opacity-50 pointer-events-none select-none"
          )}
        >
          {/* Module Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Module Visibility</CardTitle>
              <CardDescription>
                Choose which modules are visible to clients in their portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MODULES.map((mod) => {
                const Icon = mod.icon;
                const isEnabled = settings.modules[mod.key];
                return (
                  <div
                    key={mod.key}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 transition-colors",
                      isEnabled
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-md p-2",
                          isEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !isEnabled && "text-muted-foreground"
                          )}
                        >
                          {mod.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleModuleToggle(mod.key)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Welcome Card</CardTitle>
                  <CardDescription>
                    Configure the welcome card shown to clients when they
                    first log in.
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.welcomeCard.enabled}
                  onCheckedChange={(checked) =>
                    updateWelcomeCard({ enabled: checked })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="welcome-title">Title</Label>
                <Input
                  id="welcome-title"
                  value={settings.welcomeCard.title}
                  onChange={(e) =>
                    updateWelcomeCard({ title: e.target.value })
                  }
                  placeholder="Welcome to the Client Portal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-description">Description</Label>
                <Textarea
                  id="welcome-description"
                  value={settings.welcomeCard.description}
                  onChange={(e) =>
                    updateWelcomeCard({ description: e.target.value })
                  }
                  placeholder="A brief welcome message..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Bullet Points</Label>
                <div className="space-y-2">
                  {settings.welcomeCard.bulletPoints.map((point, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={point}
                        onChange={(e) =>
                          handleBulletPointChange(idx, e.target.value)
                        }
                        placeholder="Enter a bullet point"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBulletPoint(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddBulletPoint}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bullet Point
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="welcome-media-url">Media URL</Label>
                <div className="flex gap-3">
                  <Input
                    id="welcome-media-url"
                    value={settings.welcomeCard.mediaUrl ?? ""}
                    onChange={(e) =>
                      updateWelcomeCard({
                        mediaUrl: e.target.value || null,
                      })
                    }
                    placeholder="https://example.com/welcome-video.mp4"
                    className="flex-1"
                  />
                  <div className="flex gap-1 rounded-lg border p-1">
                    {[
                      { value: null, label: "None" },
                      { value: "image", label: "Image" },
                      { value: "video", label: "Video" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() =>
                          updateWelcomeCard({
                            mediaType: opt.value as
                              | "image"
                              | "video"
                              | null,
                          })
                        }
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          settings.welcomeCard.mediaType === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="show-on-first-visit"
                  checked={settings.welcomeCard.showOnFirstVisitOnly}
                  onCheckedChange={(checked) =>
                    updateWelcomeCard({
                      showOnFirstVisitOnly: checked,
                    })
                  }
                />
                <Label htmlFor="show-on-first-visit" className="cursor-pointer">
                  Show on first visit only
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Getting Started Checklist
                  </CardTitle>
                  <CardDescription>
                    Create an onboarding checklist to guide new clients
                    through setup steps.
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.checklist.enabled}
                  onCheckedChange={handleChecklistToggle}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.checklist.steps.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No checklist steps yet. Add one to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {settings.checklist.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Step {idx + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Title</Label>
                          <Input
                            value={step.title}
                            onChange={(e) =>
                              handleStepChange(idx, "title", e.target.value)
                            }
                            placeholder="Complete your profile"
                          />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={step.description}
                            onChange={(e) =>
                              handleStepChange(
                                idx,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Fill in your company details and contact information"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Video URL (optional)</Label>
                          <Input
                            value={step.videoUrl ?? ""}
                            onChange={(e) =>
                              handleStepChange(
                                idx,
                                "videoUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://example.com/tutorial.mp4"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Action Label (optional)</Label>
                          <Input
                            value={step.actionLabel ?? ""}
                            onChange={(e) =>
                              handleStepChange(
                                idx,
                                "actionLabel",
                                e.target.value
                              )
                            }
                            placeholder="Go to profile"
                          />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label>Action URL (optional)</Label>
                          <Input
                            value={step.actionUrl ?? ""}
                            onChange={(e) =>
                              handleStepChange(
                                idx,
                                "actionUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://portal.example.com/profile"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleAddStep}>
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          {/* Helpful Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Helpful Links</CardTitle>
              <CardDescription>
                Curated links displayed on the client dashboard for quick
                access to resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.helpfulLinks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No links yet. Add links to helpful resources for your
                  clients.
                </p>
              ) : (
                <div className="space-y-3">
                  {settings.helpfulLinks.map((link, idx) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={link.title}
                        onChange={(e) =>
                          handleLinkChange(idx, "title", e.target.value)
                        }
                        placeholder="Link title"
                        className="flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) =>
                          handleLinkChange(idx, "url", e.target.value)
                        }
                        placeholder="https://example.com"
                        className="flex-[2]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLink(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleAddLink}>
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </CardContent>
          </Card>

          {/* Helpful Files */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Helpful Files</CardTitle>
              <CardDescription>
                Upload or link to files that clients can download from their
                dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.helpfulFiles.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No files yet. Add files that your clients might find useful.
                </p>
              ) : (
                <div className="space-y-3">
                  {settings.helpfulFiles.map((file, idx) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={file.title}
                        onChange={(e) =>
                          handleFileChange(idx, "title", e.target.value)
                        }
                        placeholder="File name"
                        className="flex-1"
                      />
                      <Input
                        value={file.fileUrl}
                        onChange={(e) =>
                          handleFileChange(idx, "fileUrl", e.target.value)
                        }
                        placeholder="https://example.com/file.pdf"
                        className="flex-[2]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleAddFile}>
                <Plus className="mr-2 h-4 w-4" />
                Add File
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Bottom Save & Preview */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Changes are saved immediately to Firestore.
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                      "leadflow_client_portal_preview_settings",
                      JSON.stringify(settings)
                    );
                  }
                  enterPreview("preview-client", "Preview Client");
                  router.push("/client/dashboard");
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </RequireModuleAccess>
  );
}
