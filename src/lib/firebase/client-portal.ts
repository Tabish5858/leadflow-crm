import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  ClientPortalSettings,
  ClientChecklistProgress,
} from "@/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/types";

const PORTAL_SETTINGS_COLLECTION = "client_portal_settings";
const CHECKLIST_PROGRESS_COLLECTION = "client_checklist_progress";

// ─── Portal Settings ─────────────────────────────────────────────────────────

/**
 * Get portal settings for a workspace.
 * If none exist, creates default settings and returns them.
 */
export async function getClientPortalSettings(
  workspaceId: string
): Promise<ClientPortalSettings> {
  const ref = doc(db, PORTAL_SETTINGS_COLLECTION, workspaceId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as ClientPortalSettings;
  }

  // Create default settings
  const defaults: ClientPortalSettings = {
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
    updatedAt: Timestamp.now(),
    updatedBy: "system",
  };

  await setDoc(ref, defaults);
  return defaults;
}

/**
 * Update portal settings for a workspace (owner/admin only).
 */
export async function updateClientPortalSettings(
  workspaceId: string,
  settings: Partial<ClientPortalSettings>,
  userId: string
): Promise<void> {
  const ref = doc(db, PORTAL_SETTINGS_COLLECTION, workspaceId);
  await updateDoc(ref, {
    ...settings,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

// ─── Checklist Progress ──────────────────────────────────────────────────────

/**
 * Get the client's checklist progress.
 * Returns default if none exists yet.
 */
export async function getChecklistProgress(
  workspaceId: string,
  userId: string
): Promise<ClientChecklistProgress> {
  const docId = `${workspaceId}_${userId}`;
  const ref = doc(db, CHECKLIST_PROGRESS_COLLECTION, docId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as ClientChecklistProgress;
  }

  return {
    id: docId,
    workspaceId,
    userId,
    completedStepIds: [],
    dismissedWelcomeCard: false,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Mark a checklist step as completed.
 */
export async function completeChecklistStep(
  workspaceId: string,
  userId: string,
  stepId: string
): Promise<void> {
  const docId = `${workspaceId}_${userId}`;
  const ref = doc(db, CHECKLIST_PROGRESS_COLLECTION, docId);
  const progress = await getChecklistProgress(workspaceId, userId);

  if (progress.completedStepIds.includes(stepId)) return;

  await setDoc(
    ref,
    {
      ...progress,
      completedStepIds: [...progress.completedStepIds, stepId],
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Dismiss the welcome card (so it doesn't show again).
 */
export async function dismissWelcomeCard(
  workspaceId: string,
  userId: string
): Promise<void> {
  const docId = `${workspaceId}_${userId}`;
  const ref = doc(db, CHECKLIST_PROGRESS_COLLECTION, docId);
  await setDoc(
    ref,
    {
      id: docId,
      workspaceId,
      userId,
      dismissedWelcomeCard: true,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
