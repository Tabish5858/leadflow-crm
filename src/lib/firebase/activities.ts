import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Activity } from "@/types";

const ACTIVITIES_COLLECTION = "activities";

export async function createActivity(
  data: Omit<Activity, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getActivitiesByLead(
  leadId: string
): Promise<Activity[]> {
  const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
  const q = query(
    activitiesRef,
    where("leadId", "==", leadId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Activity[];
}

export function subscribeToLeadActivities(
  leadId: string,
  callback: (activities: Activity[]) => void
): () => void {
  const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
  const q = query(
    activitiesRef,
    where("leadId", "==", leadId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Activity[];
    callback(activities);
  });
}

export async function logStatusChange(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "status_change",
    subject: `Status changed from "${fromStatus}" to "${toStatus}"`,
    body: null,
    createdBy,
  });
}

export async function logNote(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  note: string
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "note",
    subject: "Note added",
    body: note,
    createdBy,
  });
}

export async function logCall(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  subject: string,
  body: string,
  duration?: number,
  direction?: "inbound" | "outbound"
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "call",
    subject,
    body,
    duration,
    direction,
    createdBy,
  });
}

export async function logEmail(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  subject: string,
  body: string,
  direction?: "inbound" | "outbound"
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "email",
    subject,
    body,
    direction,
    createdBy,
  });
}

export async function logMeeting(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  subject: string,
  body: string,
  duration?: number
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "meeting",
    subject,
    body,
    duration,
    createdBy,
  });
}
