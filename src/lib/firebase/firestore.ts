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
  orderBy,
  limit,
  startAfter,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Lead } from "@/types";

const LEADS_COLLECTION = "leads";

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createLead(data: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const docRef = await addDoc(leadsRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getLead(id: string): Promise<Lead | null> {
  const docRef = doc(db, LEADS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Lead;
}

export async function getLeadsByWorkspace(
  workspaceId: string,
  pageSize = 50,
  cursor?: DocumentData | null
): Promise<{ leads: Lead[]; lastVisible: DocumentData | null; total: number }> {
  const leadsRef = collection(db, LEADS_COLLECTION);

  const constraints: Parameters<typeof query>[1][] = [
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  const q = query(leadsRef, ...constraints);
  const snapshot = await getDocs(q);
  const leads = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Lead[];

  const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  // Get total count (cheap, no data read)
  const countQuery = query(leadsRef, where("workspaceId", "==", workspaceId));
  const countSnapshot = await getCountFromServer(countQuery);

  return { leads, lastVisible, total: countSnapshot.data().count };
}

export async function getAllLeadsByWorkspace(
  workspaceId: string
): Promise<{ leads: Lead[]; total: number }> {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc"),
    limit(1000)
  );
  const snapshot = await getDocs(q);
  const leads = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Lead[];

  const countQuery = query(leadsRef, where("workspaceId", "==", workspaceId));
  const countSnapshot = await getCountFromServer(countQuery);

  return { leads, total: countSnapshot.data().count };
}

export async function getLeadsByStatus(
  workspaceId: string,
  status: string
): Promise<Lead[]> {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where("workspaceId", "==", workspaceId),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Lead[];
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchLeads(
  workspaceId: string,
  searchTerm: string
): Promise<Lead[]> {
  const leadsRef = collection(db, LEADS_COLLECTION);
  // Firestore doesn't support full-text search natively;
  // we fetch and filter client-side for MVP
  const q = query(
    leadsRef,
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snapshot = await getDocs(q);
  const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Lead[];

  const term = searchTerm.toLowerCase();
  return leads.filter(
    (lead) =>
      lead.firstName.toLowerCase().includes(term) ||
      lead.lastName.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      (lead.company?.toLowerCase().includes(term) ?? false) ||
      lead.tags.some((tag) => tag.toLowerCase().includes(term))
  );
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateLead(id: string, data: Partial<Lead>): Promise<void> {
  const docRef = doc(db, LEADS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteLead(id: string): Promise<void> {
  const docRef = doc(db, LEADS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function deleteLeads(ids: string[]): Promise<void> {
  const promises = ids.map((id) => deleteDoc(doc(db, LEADS_COLLECTION, id)));
  await Promise.all(promises);
}

// ─── Real-time Listener ──────────────────────────────────────────────────────

export function subscribeToLeads(
  workspaceId: string,
  callback: (leads: Lead[]) => void
): () => void {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lead[];
    callback(leads);
  });
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getLeadStats(workspaceId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
}> {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, where("workspaceId", "==", workspaceId));
  const snapshot = await getDocs(q);

  let totalValue = 0;
  const byStatus: Record<string, number> = {};

  snapshot.docs.forEach((docSnap) => {
    const lead = docSnap.data() as Lead;
    totalValue += lead.value || 0;
    const status = lead.status || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return {
    total: snapshot.size,
    byStatus,
    totalValue,
  };
}
