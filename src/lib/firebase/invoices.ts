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
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Invoice, InvoiceStatus, InvoiceLineItem } from "@/types";

const COLLECTION = "invoices";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

/** Generate next invoice number (INV-{year}-{sequential}) */
export async function generateInvoiceNumber(
  workspaceId: string
): Promise<string> {
  if (isDemoMode()) {
    return `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
  }

  const year = new Date().getFullYear();
  const q = query(
    collection(db, COLLECTION),
    where("workspaceId", "==", workspaceId),
    where("invoiceNumber", ">=", `INV-${year}-`),
    where("invoiceNumber", "<", `INV-${year}-~`),
    orderBy("invoiceNumber", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);

  let seq = 1;
  if (!snap.empty) {
    const last = snap.docs[0].data().invoiceNumber as string;
    const parts = last.split("-");
    seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
  }

  return `INV-${year}-${String(seq).padStart(3, "0")}`;
}

// ── Create ───────────────────────────────────────────────────────────────────

export interface CreateInvoiceData {
  clientId: string;
  projectId?: string | null;
  invoiceNumber?: string;
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  currency?: string;
  notes?: string | null;
  issueDate?: Date;
  dueDate?: Date;
}

export async function createInvoice(
  workspaceId: string,
  userId: string,
  data: CreateInvoiceData
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createInvoice(workspaceId, userId, data as unknown as Record<string, unknown>);
  }

  // Compute financials
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = data.taxRate ?? 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const invoiceNumber =
    data.invoiceNumber || (await generateInvoiceNumber(workspaceId));
  const now = new Date();
  const issueDate = data.issueDate || now;
  const dueDate =
    data.dueDate || new Date(now.getTime() + 30 * 86400000); // 30 days

  const docRef = await addDoc(collection(db, COLLECTION), {
    workspaceId,
    clientId: data.clientId,
    projectId: data.projectId || null,
    invoiceNumber,
    status: "draft",
    lineItems: data.lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: data.currency || "USD",
    issueDate: Timestamp.fromDate(issueDate),
    dueDate: Timestamp.fromDate(dueDate),
    paidDate: null,
    notes: data.notes || null,
    pdfUrl: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ── Read (single) ────────────────────────────────────────────────────────────

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getInvoice(id);
  }

  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invoice;
}

// ── Read (list) ──────────────────────────────────────────────────────────────

export async function getInvoices(
  workspaceId: string,
  opts?: {
    status?: InvoiceStatus;
    clientId?: string;
    max?: number;
  }
): Promise<Invoice[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    let items = demoStore.getInvoices().filter((inv) => inv.workspaceId === workspaceId);
    if (opts?.status) items = items.filter((inv) => inv.status === opts.status);
    if (opts?.clientId) items = items.filter((inv) => inv.clientId === opts.clientId);
    return items;
  }

  const conditions = [where("workspaceId", "==", workspaceId)];
  if (opts?.status) conditions.push(where("status", "==", opts.status));
  if (opts?.clientId) conditions.push(where("clientId", "==", opts.clientId));

  const q = opts?.max
    ? query(collection(db, COLLECTION), ...conditions, orderBy("createdAt", "desc"), limit(opts.max))
    : query(collection(db, COLLECTION), ...conditions, orderBy("createdAt", "desc"));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice);
}

// ── Update ───────────────────────────────────────────────────────────────────

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  lineItems?: InvoiceLineItem[];
  taxRate?: number;
  notes?: string | null;
  dueDate?: Date;
}

export async function updateInvoice(id: string, data: UpdateInvoiceData): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateInvoice(id, data as unknown as Record<string, unknown>);
    return;
  }

  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Recompute financials if line items changed
  if (data.lineItems) {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = (data.taxRate ?? 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    updatePayload.subtotal = subtotal;
    updatePayload.taxAmount = taxAmount;
    updatePayload.total = total;
  }

  // If marked as paid, set paidDate
  if (data.status === "paid") {
    updatePayload.paidDate = Timestamp.now();
  }

  delete updatePayload.lineItems; // already handled above
  if (data.lineItems) {
    updatePayload.lineItems = data.lineItems;
  }

  await updateDoc(doc(db, COLLECTION, id), updatePayload);
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInvoice(id: string): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.deleteInvoice(id);
    return;
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
