import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ProjectTask } from "@/types";

const COLLECTION = "project_tasks";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

// ── Create ───────────────────────────────────────────────────────────────────

export type CreateTaskData = {
  taskName: string;
  description?: string | null;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  milestoneId?: string | null;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  visibility?: "Public" | "Private";
  isMilestone?: boolean;
};

export async function createTask(
  projectId: string,
  workspaceId: string,
  userId: string,
  data: CreateTaskData
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createProjectTask(projectId, workspaceId, data);
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    workspaceId,
    taskName: data.taskName,
    description: data.description || null,
    assigneeId: data.assigneeId || null,
    parentTaskId: data.parentTaskId || null,
    milestoneId: data.milestoneId || null,
    isSubtask: !!data.parentTaskId,
    hasSubtasks: false,
    status: {
      parent: "To Do",
      name: "Not Started",
      color: "#F5EFCF",
    },
    priority: data.priority || null,
    startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    startDateDays: null,
    dueDateDays: null,
    startDateReference: null,
    dueDateReference: null,
    recurring: false,
    recurringDetails: null,
    weekDays: [],
    visibility: data.visibility || "Public",
    order: 0,
    isMilestone: data.isMilestone || false,
    completedAt: null,
    customFields: {},
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
  });
  return docRef.id;
}

// ── Read (single) ────────────────────────────────────────────────────────────

export async function getTask(id: string): Promise<ProjectTask | null> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getProjectTask(id);
  }

  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.isDeleted) return null;
  return { id: snap.id, ...data } as ProjectTask;
}

// ── Read (list by project) ───────────────────────────────────────────────────

export async function getProjectTasks(projectId: string): Promise<ProjectTask[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getProjectTasks(projectId);
  }

  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  let results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectTask)
    .filter((t) => !t.isDeleted);
  // Sort in-memory to avoid needing composite index
  results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  return results;
}

// ── Read (subtasks) ──────────────────────────────────────────────────────────

export async function getSubtasks(parentTaskId: string): Promise<ProjectTask[]> {
  const q = query(
    collection(db, COLLECTION),
    where("parentTaskId", "==", parentTaskId)
  );
  const snap = await getDocs(q);
  let results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectTask)
    .filter((t) => !t.isDeleted);
  // Sort in-memory
  results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return results;
}

// ── Update ───────────────────────────────────────────────────────────────────

export type UpdateTaskData = Partial<
  Pick<ProjectTask, "taskName" | "description" | "assigneeId" | "status" | "priority" | "visibility" | "order" | "isMilestone">
> & {
  startDate?: Date | null;
  dueDate?: Date | null;
  milestoneId?: string | null;
  parentTaskId?: string | null;
};

export async function updateTask(id: string, data: UpdateTaskData): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateProjectTask(id, data);
    return;
  }

  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.startDate !== undefined) {
    updatePayload.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
  }
  if (data.dueDate !== undefined) {
    updatePayload.dueDate = data.dueDate ? Timestamp.fromDate(data.dueDate) : null;
  }

  // If status set to Complete, set completedAt
  if (data.status && typeof data.status === "object" && (data.status as any).parent === "Complete") {
    updatePayload.completedAt = Timestamp.now();
  }

  // If setting parentTaskId, mark as subtask
  if (data.parentTaskId !== undefined) {
    updatePayload.isSubtask = !!data.parentTaskId;
  }

  await updateDoc(doc(db, COLLECTION, id), updatePayload);
}

// ── Delete (soft) ────────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.deleteProjectTask(id);
    return;
  }

  await updateDoc(doc(db, COLLECTION, id), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
}
