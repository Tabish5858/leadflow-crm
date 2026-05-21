import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const EMAILS_COLLECTION = "emails";

export interface EmailRecord {
  id: string;
  workspaceId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "draft";
  sentAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
}

export async function sendEmail(data: {
  workspaceId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  createdBy: string;
}): Promise<string> {
  // In production, this would call a Next.js API route that uses Resend
  // For now, we simulate sending and store the record
  const docRef = await addDoc(collection(db, EMAILS_COLLECTION), {
    ...data,
    status: "sent",
    sentAt: Timestamp.now(),
    createdAt: Timestamp.now(),
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return docRef.id;
}

export async function saveDraft(data: {
  workspaceId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  createdBy: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, EMAILS_COLLECTION), {
    ...data,
    status: "draft",
    sentAt: null,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getEmailsForLead(leadId: string): Promise<EmailRecord[]> {
  const q = query(
    collection(db, EMAILS_COLLECTION),
    where("leadId", "==", leadId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailRecord));
}

export async function getEmailsForWorkspace(workspaceId: string): Promise<EmailRecord[]> {
  const q = query(
    collection(db, EMAILS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailRecord));
}
