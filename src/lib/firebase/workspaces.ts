import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Workspace, WorkspaceMember, WorkspaceInvite } from "@/types";

const WORKSPACES_COLLECTION = "workspaces";
const USERS_COLLECTION = "users";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

const INVITES_COLLECTION = "workspace_invites";

// ─── Default Pipeline ────────────────────────────────────────────────────────

export const DEFAULT_PIPELINE_STAGES = [
  { id: "new", name: "New", color: "#3b82f6", probability: 0, order: 0 },
  { id: "contacted", name: "Contacted", color: "#eab308", probability: 10, order: 1 },
  { id: "qualified", name: "Qualified", color: "#f97316", probability: 25, order: 2 },
  { id: "proposal", name: "Proposal", color: "#a855f7", probability: 50, order: 3 },
  { id: "negotiation", name: "Negotiation", color: "#ef4444", probability: 75, order: 4 },
  { id: "won", name: "Won", color: "#22c55e", probability: 100, order: 5 },
  { id: "lost", name: "Lost", color: "#6b7280", probability: 0, order: 6 },
];

// ─── Create Workspace ────────────────────────────────────────────────────────

export async function createWorkspace(
  userId: string,
  name: string
): Promise<string> {
  const workspaceId = crypto.randomUUID();
  await addDoc(collection(db, WORKSPACES_COLLECTION), {
    id: workspaceId,
    name,
    logoUrl: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    weekStart: "monday",
    pipeline: { stages: DEFAULT_PIPELINE_STAGES },
    customFields: [],
    niches: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ownerId: userId,
    memberIds: [userId],
  });

  return workspaceId;
}

// ─── Read Workspace ──────────────────────────────────────────────────────────

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  if (isDemoMode()) {
    const { DEMO_WORKSPACE } = await import("@/lib/demo/demo-data");
    return DEMO_WORKSPACE;
  }

  const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Workspace;
}

export async function getUserWorkspaces(userIds: string[]): Promise<Workspace[]> {
  const workspacesRef = collection(db, WORKSPACES_COLLECTION);
  const q = query(workspacesRef, where("memberIds", "array-contains-any", userIds.slice(0, 10)));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Workspace[];
}

export function subscribeToUserWorkspaces(
  userId: string,
  callback: (workspaces: Workspace[]) => void
): () => void {
  const workspacesRef = collection(db, WORKSPACES_COLLECTION);
  const q = query(workspacesRef, where("memberIds", "array-contains", userId));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const workspaces = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Workspace[];
    callback(workspaces);
  });
}

// ─── Update Workspace ────────────────────────────────────────────────────────

/**
 * Recursively removes undefined values from an object or array.
 * Firestore does not accept undefined field values.
 */
function sanitizeFirestoreData(data: unknown): unknown {
  if (data === null || data === undefined) return null;
  if (data instanceof Timestamp) return data;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData);
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeFirestoreData(value);
    }
  }
  return cleaned;
}

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<Workspace>
): Promise<void> {
  const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
  const payload = sanitizeFirestoreData({
    ...data,
    updatedAt: Timestamp.now(),
  }) as Record<string, unknown>;
  await updateDoc(docRef, payload);
}

export async function updateWorkspaceName(
  workspaceId: string,
  name: string
): Promise<void> {
  await updateWorkspace(workspaceId, { name });
}

// ─── Delete Workspace ────────────────────────────────────────────────────────

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const docRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
  await deleteDoc(docRef);
}

// ─── Membership ──────────────────────────────────────────────────────────────

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  if (isDemoMode()) {
    const { DEMO_TEAM_MEMBERS } = await import("@/lib/demo/demo-data");
    return [
      {
        userId: "demo-user-001",
        email: "demo@leadflow.dev",
        displayName: "Sarah Chen",
        photoURL: null,
        role: "owner",
        joinedAt: Timestamp.now(),
      },
      ...DEMO_TEAM_MEMBERS.map((m) => ({
        userId: m.id,
        email: m.email,
        displayName: m.displayName,
        photoURL: null,
        role: "member" as const,
        joinedAt: Timestamp.now(),
      })),
    ];
  }

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return [];

  const memberIds = workspace.memberIds || [];
  if (memberIds.length === 0) return [];

  // Firestore "in" operator maxes out at 30 values — batch if needed
  const batches: string[][] = [];
  for (let i = 0; i < memberIds.length; i += 30) {
    batches.push(memberIds.slice(i, i + 30));
  }

  const results: WorkspaceMember[] = [];
  const membersRef = collection(db, USERS_COLLECTION);
  for (const ids of batches) {
    const q = query(membersRef, where("__name__", "in", ids));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const user = d.data();
      const workspaceRole = user.workspaceRoles?.[workspaceId] || user.role || "member";
      results.push({
        userId: d.id,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || null,
        role: workspaceRole,
        joinedAt: user.createdAt || Timestamp.now(),
      } as WorkspaceMember);
    }
  }

  return results;
}

export async function addMemberToWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.memberIds.includes(userId)) return;

  const memberIds = [...workspace.memberIds, userId];
  await updateWorkspace(workspaceId, { memberIds });

  // Update user's workspaceIds
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const workspaceIds = userData.workspaceIds || [];
    if (!workspaceIds.includes(workspaceId)) {
      await updateDoc(userRef, {
        workspaceIds: [...workspaceIds, workspaceId],
      });
    }
  }
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  userId: string,
  currentUserId: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ownerId === userId) throw new Error("Cannot remove the workspace owner");
  if (workspace.ownerId !== currentUserId) throw new Error("Only the owner can remove members");

  const memberIds = workspace.memberIds.filter((id) => id !== userId);
  await updateWorkspace(workspaceId, { memberIds });

  // Update user's workspaceIds
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const workspaceIds = (userData.workspaceIds || []).filter((id: string) => id !== workspaceId);
    await updateDoc(userRef, { workspaceIds: workspaceIds });
  }
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: "admin" | "member" | "viewer" | "client"
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  // Update only the per-workspace role - do NOT touch the top-level role field
  // (otherwise changing a user's role in one workspace corrupts their role in others)
  await updateDoc(userRef, {
    [`workspaceRoles.${workspaceId}`]: role,
  });
}

// ─── Leave Workspace ─────────────────────────────────────────────────────────

export async function leaveWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ownerId === userId) throw new Error("Owner cannot leave their workspace. Transfer ownership or delete it.");

  const memberIds = workspace.memberIds.filter((id) => id !== userId);
  await updateWorkspace(workspaceId, { memberIds });

  // Update user's workspaceIds and activeWorkspaceId
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const workspaceIds = (userData.workspaceIds || []).filter((id: string) => id !== workspaceId);
    const activeWorkspaceId = userData.activeWorkspaceId === workspaceId
      ? (workspaceIds.length > 0 ? workspaceIds[0] : null)
      : userData.activeWorkspaceId;

    await updateDoc(userRef, {
      workspaceIds,
      activeWorkspaceId,
    });
  }
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export async function createInvite(
  workspaceId: string,
  email: string,
  invitedBy: string,
  role: "admin" | "member" | "viewer" | "client" = "member"
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const docRef = await addDoc(collection(db, INVITES_COLLECTION), {
    workspaceId,
    email: email.toLowerCase(),
    invitedBy,
    role,
    status: "pending",
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function acceptInvite(
  inviteId: string,
  userId: string
): Promise<void> {
  const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("Invite not found");

  const invite = inviteSnap.data() as WorkspaceInvite;
  if (invite.status !== "pending") throw new Error("Invite is no longer valid");
  if (invite.expiresAt.toDate() < new Date()) throw new Error("Invite has expired");

  const batch = writeBatch(db);

  // Update invite status
  batch.update(inviteRef, { status: "accepted" });

  // Add user to workspace
  const workspaceRef = doc(db, WORKSPACES_COLLECTION, invite.workspaceId);
  const workspaceSnap = await getDoc(workspaceRef);
  if (workspaceSnap.exists()) {
    const workspace = workspaceSnap.data() as Workspace;
    if (!workspace.memberIds.includes(userId)) {
      batch.update(workspaceRef, {
        memberIds: [...workspace.memberIds, userId],
      });
    }
  }

  // Update user's workspaceIds and active workspace
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const workspaceIds = userData.workspaceIds || [];
    const updates: Record<string, unknown> = {};

    if (!workspaceIds.includes(invite.workspaceId)) {
      updates.workspaceIds = [...workspaceIds, invite.workspaceId];
    }

    // Set as active workspace if none is set (newly created invited user)
    if (!userData.activeWorkspaceId) {
      updates.activeWorkspaceId = invite.workspaceId;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(userRef, updates);
    }

    // Set per-workspace role if not already set
    if (!(userData.workspaceRoles || {})[invite.workspaceId]) {
      batch.set(userRef, { workspaceRoles: { ...(userData.workspaceRoles || {}), [invite.workspaceId]: invite.role } }, { merge: true });
    }
  }

  await batch.commit();
}

export async function getPendingInvites(
  email: string
): Promise<(WorkspaceInvite & { id: string })[]> {
  const invitesRef = collection(db, INVITES_COLLECTION);
  const q = query(
    invitesRef,
    where("email", "==", email.toLowerCase()),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as (WorkspaceInvite & { id: string })[];
}

export async function getPendingInvitesForWorkspace(
  workspaceId: string
): Promise<(WorkspaceInvite & { id: string })[]> {
  const invitesRef = collection(db, INVITES_COLLECTION);
  const q = query(
    invitesRef,
    where("workspaceId", "==", workspaceId),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as (WorkspaceInvite & { id: string })[];
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
  await updateDoc(inviteRef, { status: "expired" });
}

// ─── Set Active Workspace ────────────────────────────────────────────────────

export async function setActiveWorkspace(
  userId: string,
  workspaceId: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, { activeWorkspaceId: workspaceId });
}
