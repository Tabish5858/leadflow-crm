import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Meeting } from "@/types";
import { demoStore } from "@/lib/demo/demo-data";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

const MEETINGS_COLLECTION = "meetings";

/* ── Create Meeting ────────────────────────────────────────────── */

export async function createMeeting(data: Omit<Meeting, "id" | "createdAt" | "updatedAt">): Promise<string> {
  if (isDemoMode()) {
    const id = `demo-meeting-${Date.now()}`;
    const now = Timestamp.now();
    const meeting: Meeting = {
      id,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      attendees: data.attendees,
      conferencingTool: data.conferencingTool,
      googleMeetLink: data.googleMeetLink,
      calendarEventId: data.calendarEventId,
      calendarEventUrl: data.calendarEventUrl,
      status: data.status,
      meetingType: data.meetingType,
      leadId: data.leadId,
      clientId: data.clientId,
      conversationId: data.conversationId,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    demoStore.addMeeting(meeting);
    return id;
  }

  /* Strip undefined values - Firestore rejects them */
  const docData: Record<string, unknown> = {
    workspaceId: data.workspaceId,
    title: data.title,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone,
    attendees: data.attendees,
    conferencingTool: data.conferencingTool,
    googleMeetLink: data.googleMeetLink,
    calendarEventId: data.calendarEventId,
    status: data.status,
    meetingType: data.meetingType,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (data.leadId) docData.leadId = data.leadId;
  if (data.clientId) docData.clientId = data.clientId;
  if (data.conversationId) docData.conversationId = data.conversationId;
  if (data.description) docData.description = data.description;
  if (data.calendarEventUrl) docData.calendarEventUrl = data.calendarEventUrl;

  const docRef = await addDoc(collection(db, MEETINGS_COLLECTION), docData);
  return docRef.id;
}

/* ── Get Single Meeting ─────────────────────────────────────────── */

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  if (isDemoMode()) return demoStore.getMeetings().find((m) => m.id === meetingId) || null;
  const snap = await getDoc(doc(db, MEETINGS_COLLECTION, meetingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Meeting;
}

/* ── List Meetings for Workspace ────────────────────────────────── */

export async function getMeetings(workspaceId: string): Promise<Meeting[]> {
  if (isDemoMode()) return demoStore.getMeetings();
  const q = query(
    collection(db, MEETINGS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("startTime", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meeting);
}

/* ── Update Meeting Status ──────────────────────────────────────── */

export async function updateMeetingStatus(
  meetingId: string,
  status: Meeting["status"]
): Promise<void> {
  if (isDemoMode()) {
    demoStore.updateMeeting(meetingId, { status });
    return;
  }
  await updateDoc(doc(db, MEETINGS_COLLECTION, meetingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/* ── Cancel Meeting ─────────────────────────────────────────────── */

export async function cancelMeeting(meetingId: string): Promise<void> {
  if (isDemoMode()) {
    demoStore.cancelMeeting(meetingId);
    return;
  }
  await updateDoc(doc(db, MEETINGS_COLLECTION, meetingId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

/* ── Get Meetings for a Lead ───────────────────────────────────── */

export async function getMeetingsForLead(
  workspaceId: string,
  leadId: string
): Promise<Meeting[]> {
  if (isDemoMode()) return demoStore.getMeetings().filter((m) => m.leadId === leadId);
  const q = query(
    collection(db, MEETINGS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    where("leadId", "==", leadId),
    orderBy("startTime", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meeting);
}
