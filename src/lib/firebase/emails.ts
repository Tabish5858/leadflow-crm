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
import { getApiAuthHeaders } from "@/lib/api/client";

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
  resendId?: string;
  trackingEnabled?: boolean;
}

export async function sendEmail(data: {
  workspaceId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  createdBy: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}): Promise<string> {
  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getApiAuthHeaders(data.workspaceId)),
    },
    body: JSON.stringify({
      to: data.to,
      subject: data.subject,
      html: data.body.replace(/\n/g, "<br/>"),
      text: data.body,
      leadId: data.leadId,
      trackOpens: data.trackOpens !== false,
      trackClicks: data.trackClicks !== false,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to send email");
  }

  return result.emailId;
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
