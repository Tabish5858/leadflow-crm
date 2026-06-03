import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ProjectMilestone } from "@/types";

const COLLECTION = "project_milestones";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

// ── Create ───────────────────────────────────────────────────────────────────

export type CreateMilestoneData = {
  milestoneName: string;
  description?: string | null;
  dueDate?: Date | null;
};

export async function createMilestone(
  projectId: string,
  workspaceId: string,
  userId: string,
  data: CreateMilestoneData
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createProjectMilestone(projectId, workspaceId, data);
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    workspaceId,
    milestoneName: data.milestoneName,
    description: data.description || null,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    status: "Pending",
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
  });
  return docRef.id;
}

// ── Read (list by project) ───────────────────────────────────────────────────

export async function getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getProjectMilestones(projectId);
  }

  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  let results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectMilestone)
    .filter((m) => !m.isDeleted);
  results.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  return results;
}

// ── Read (single) ────────────────────────────────────────────────────────────

export async function getMilestone(id: string): Promise<ProjectMilestone | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.isDeleted) return null;
  return { id: snap.id, ...data } as ProjectMilestone;
}

// ── Update ───────────────────────────────────────────────────────────────────

export type UpdateMilestoneData = Partial<
  Pick<ProjectMilestone, "milestoneName" | "description" | "status">
> & {
  dueDate?: Date | null;
};

export async function updateMilestone(id: string, data: UpdateMilestoneData): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.dueDate !== undefined) {
    updatePayload.dueDate = data.dueDate ? Timestamp.fromDate(data.dueDate) : null;
  }

  await updateDoc(doc(db, COLLECTION, id), updatePayload);
}

// ── Delete (soft) ────────────────────────────────────────────────────────────

export async function deleteMilestone(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
}
