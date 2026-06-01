"use client";

import { ActionItemsCard } from "@/components/client/action-items-card";
import { ChecklistCard } from "@/components/client/checklist-card";
import { HelpfulFilesCard } from "@/components/client/helpful-files-card";
import { HelpfulLinksCard } from "@/components/client/helpful-links-card";
import { MeetingsWidget } from "@/components/client/meetings-widget";
import { MessagesWidget } from "@/components/client/messages-widget";
import { ProjectsWidget } from "@/components/client/projects-widget";
import { WelcomeCard } from "@/components/client/welcome-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientUser } from "@/contexts/client-user-context";
import { getChecklistProgress, getClientPortalSettings } from "@/lib/firebase/client-portal";
import type { ClientPortalSettings } from "@/types";
import { useEffect, useState } from "react";

export default function ClientDashboardPage() {
  const { uid, displayName, email, clientWorkspaceId } = useClientUser();
  const [settings, setSettings] = useState<ClientPortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientWorkspaceId) return;

    (async () => {
      try {
        const [portalSettings, progress] = await Promise.all([
          getClientPortalSettings(clientWorkspaceId),
          getChecklistProgress(clientWorkspaceId, uid),
        ]);
        setSettings(portalSettings);

        // Show welcome card if not dismissed and enabled
        const shouldShow =
          portalSettings.welcomeCard.enabled !== false &&
          !progress.dismissedWelcomeCard &&
          (portalSettings.welcomeCard.showOnFirstVisitOnly
            ? !progress.dismissedWelcomeCard
            : true);
        setShowWelcome(shouldShow);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Failed to load your dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientWorkspaceId, uid]);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        {/* Welcome card skeleton */}
        <Skeleton className="h-32 w-full rounded-xl" />
        {/* Widget grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName || "Client"}!
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">!</span>
          </div>
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready State ───────────────────────────────────────────────────────────
  // Determine which module widgets to show based on portal settings
  const showProjects = settings?.modules?.projects ?? true;
  const showMessages = settings?.modules?.messages ?? true;
  const showMeetings = settings?.modules?.meetings ?? true;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName || "Client"}!
        </p>
      </div>

      {/* Welcome Card */}
      {settings && showWelcome && (
        <WelcomeCard
          settings={settings}
          workspaceId={clientWorkspaceId}
          userId={uid}
          clientName={displayName}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      {/* Checklist Card */}
      {settings && (
        <ChecklistCard
          settings={settings}
          workspaceId={clientWorkspaceId}
          userId={uid}
        />
      )}

      {/* Widget Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showProjects && (
          <ProjectsWidget
            workspaceId={clientWorkspaceId}
            userId={uid}
          />
        )}

        {showMeetings && (
          <MeetingsWidget
            workspaceId={clientWorkspaceId}
            userEmail={email}
          />
        )}

        {showMessages && (
          <MessagesWidget
            workspaceId={clientWorkspaceId}
            userId={uid}
          />
        )}

        {/* Helpful Links — only if configured */}
        {settings && settings.helpfulLinks.length > 0 && (
          <HelpfulLinksCard settings={settings} />
        )}

        {/* Helpful Files — only if configured */}
        {settings && settings.helpfulFiles.length > 0 && (
          <HelpfulFilesCard settings={settings} />
        )}

        {/* Action Items — always shown */}
        <ActionItemsCard />
      </div>
    </div>
  );
}
