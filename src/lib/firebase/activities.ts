import {
  collection,
  addDoc,
  doc,
  deleteDoc,
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
import { logAuditEvent } from "@/lib/audit-log";
import type { AuditLogEntry } from "@/lib/audit-log";

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

export async function deleteActivity(id: string): Promise<void> {
  await deleteDoc(doc(db, ACTIVITIES_COLLECTION, id));
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

export async function logLeadCreated(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "system",
    subject: `Lead "${leadName}" created`,
    body: null,
    createdBy: userId,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "lead_created",
    entityType: "lead",
    entityId: leadId,
    entityName: leadName,
  });
}

export async function logLeadUpdated(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "system",
    subject: `Lead "${leadName}" updated`,
    body: null,
    createdBy: userId,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "lead_updated",
    entityType: "lead",
    entityId: leadId,
    entityName: leadName,
    oldValue,
    newValue,
  });
}

export async function logLeadDeleted(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "lead_deleted",
    entityType: "lead",
    entityId: leadId,
    entityName: leadName,
  });
}

export async function logDocumentUploaded(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string,
  documentName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "system",
    subject: `Document "${documentName}" uploaded`,
    body: null,
    createdBy: userId,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "document_uploaded",
    entityType: "document",
    entityId: leadId,
    entityName: leadName,
    metadata: { documentName, ...metadata },
  });
}

export async function logDocumentDeleted(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string,
  documentName: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "document_deleted",
    entityType: "document",
    entityId: leadId,
    entityName: leadName,
    metadata: { documentName },
  });
}

export async function logTaskCreated(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string,
  taskTitle: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "task",
    subject: `Task "${taskTitle}" created`,
    body: null,
    createdBy: userId,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "task_created",
    entityType: "task",
    entityId: leadId,
    entityName: leadName,
    metadata: { title: taskTitle, ...metadata },
  });
}

export async function logTaskCompleted(
  leadId: string,
  workspaceId: string,
  userId: string,
  userName: string,
  leadName: string,
  taskTitle: string
): Promise<void> {
  await createActivity({
    workspaceId,
    leadId,
    type: "task",
    subject: `Task "${taskTitle}" completed`,
    body: null,
    createdBy: userId,
  });

  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "task_completed",
    entityType: "task",
    entityId: leadId,
    entityName: leadName,
    metadata: { title: taskTitle },
  });
}

export async function logUserLogin(
  workspaceId: string,
  userId: string,
  userName: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "user_login",
    entityType: "user",
    entityId: userId,
    entityName: userName,
  });
}

export async function logUserLogout(
  workspaceId: string,
  userId: string,
  userName: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "user_logout",
    entityType: "user",
    entityId: userId,
    entityName: userName,
  });
}

export async function logSettingsChanged(
  workspaceId: string,
  userId: string,
  userName: string,
  settingName: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    userName,
    action: "settings_changed",
    entityType: "settings",
    entityId: workspaceId,
    entityName: settingName,
    oldValue,
    newValue,
  });
}

export async function logAuditEventWrapper(data: AuditLogEntry): Promise<void> {
  await logAuditEvent(data);
}
