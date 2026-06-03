import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ProjectNote } from "@/types";

const COLLECTION = "project_notes";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

// ── Create ───────────────────────────────────────────────────────────────────

export type CreateNoteData = {
  title: string;
  content: string;
  taskId?: string | null;
};

export async function createNote(
  projectId: string,
  workspaceId: string,
  userId: string,
  data: CreateNoteData
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createProjectNote(projectId, workspaceId, {
      title: data.title,
      content: data.content,
      taskId: data.taskId || null,
    });
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    workspaceId,
    taskId: data.taskId || null,
    title: data.title,
    content: data.content,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
  });
  return docRef.id;
}

// ── Read (list by project) ───────────────────────────────────────────────────

export async function getProjectNotes(projectId: string): Promise<ProjectNote[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getProjectNotes(projectId);
  }

  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  let results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectNote)
    .filter((n) => !n.isDeleted);
  results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return results;
}

// ── Update ───────────────────────────────────────────────────────────────────

export type UpdateNoteData = Partial<Pick<ProjectNote, "title" | "content">>;

export async function updateNote(id: string, data: UpdateNoteData): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.updateProjectNote(id, data);
  }

  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Delete (soft) ────────────────────────────────────────────────────────────

export async function deleteNote(id: string): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.deleteProjectNote(id);
  }

  await updateDoc(doc(db, COLLECTION, id), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
}
