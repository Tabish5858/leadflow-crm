/**
 * Server-side Admin SDK helpers for Firestore operations.
 * Use these in API routes instead of the client SDK to avoid
 * "Missing or insufficient permissions" errors.
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { MeetingTypeAvailability } from "@/lib/availability";

/* ── Timestamp (re-export for convenience) ─────────────────────────── */
export { Timestamp };

/* ── Workspace helpers ─────────────────────────────────────────────── */

export async function getWorkspace(workspaceId: string) {
  const snap = await getAdminDb().collection("workspaces").doc(workspaceId).get();
  return snap.exists ? snap.data() : null;
}

/* ── Meeting helpers ───────────────────────────────────────────────── */

export interface CreateMeetingInput {
  workspaceId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees: { email: string; name: string }[];
  conferencingTool: "google_meet" | "none";
  googleMeetLink: string;
  calendarEventId: string;
  calendarEventUrl?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  meetingType: "instant" | "scheduled";
  createdBy: string;
  leadId?: string;
  clientId?: string;
  conversationId?: string;
}

export async function createMeeting(data: CreateMeetingInput): Promise<string> {
  const docData: Record<string, unknown> = {
    workspaceId: data.workspaceId,
    title: data.title,
    startTime: Timestamp.fromDate(data.startTime),
    endTime: Timestamp.fromDate(data.endTime),
    timezone: data.timezone,
    attendees: data.attendees,
    conferencingTool: data.conferencingTool,
    googleMeetLink: data.googleMeetLink,
    calendarEventId: data.calendarEventId,
    status: data.status,
    meetingType: data.meetingType,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (data.leadId) docData.leadId = data.leadId;
  if (data.clientId) docData.clientId = data.clientId;
  if (data.conversationId) docData.conversationId = data.conversationId;
  if (data.description) docData.description = data.description;
  if (data.calendarEventUrl) docData.calendarEventUrl = data.calendarEventUrl;

  const docRef = await getAdminDb().collection("meetings").add(docData);
  return docRef.id;
}

/* ── Activity helpers ──────────────────────────────────────────────── */

/* ── Meeting type helpers ─────────────────────────────────────────── */

export interface BookingQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "dropdown" | "phone" | "date";
  required: boolean;
  options?: string[]; // for radio/checkbox/dropdown
}

export interface ReminderConfig {
  id: string;
  title: string;
  who: "client" | "myself" | "team" | "all";
  channel: "email" | "text";
  when: number; // minutes before meeting
  enabled: boolean;
}

export interface ServerMeetingType {
  id: string;
  workspaceId: string;
  name: string;
  duration: number;
  bufferTime: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minimumNotice?: number; // minutes — min advance notice required
  dailyLimit?: number; // max meetings per day
  videoTool: "google_meet" | "none";
  description: string;
  bookingToken: string;
  slug?: string; // human-readable URL slug (e.g. "30-min-discovery-call")
  availability?: MeetingTypeAvailability;
  bookingQuestions?: BookingQuestion[];
  reminders?: ReminderConfig[];
  confirmationPage?: "default" | "redirect";
  redirectUrl?: string;
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function generateBookingToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Generate a human-readable URL slug from a meeting type name */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  // Append short random suffix to avoid collisions (like Calendly)
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "meeting"}-${suffix}`;
}

export async function getMeetingTypeByToken(token: string): Promise<ServerMeetingType | null> {
  const q = getAdminDb()
    .collection("meeting_types")
    .where("bookingToken", "==", token)
    .where("active", "==", true)
    .limit(1);
  const snapshot = await q.get();
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as ServerMeetingType;
}

export async function getMeetingTypeBySlug(slug: string): Promise<ServerMeetingType | null> {
  const q = getAdminDb()
    .collection("meeting_types")
    .where("slug", "==", slug)
    .where("active", "==", true)
    .limit(1);
  const snapshot = await q.get();
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as ServerMeetingType;
}

export async function getMeetingType(id: string) {
  const snap = await getAdminDb().collection("meeting_types").doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getMeetingTypes(workspaceId: string) {
  const q = getAdminDb()
    .collection("meeting_types")
    .where("workspaceId", "==", workspaceId)
    .orderBy("name", "asc");
  const snapshot = await q.get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createMeetingType(data: {
  workspaceId: string;
  name: string;
  duration: number;
  bufferTime?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minimumNotice?: number;
  dailyLimit?: number;
  videoTool: "google_meet" | "none";
  description: string;
  availability?: MeetingTypeAvailability;
  bookingQuestions?: BookingQuestion[];
  reminders?: ReminderConfig[];
  confirmationPage?: "default" | "redirect";
  redirectUrl?: string;
  active: boolean;
  createdBy: string;
}): Promise<{ id: string; slug: string }> {
  const slug = generateSlug(data.name);
  const docData: Record<string, unknown> = {
    workspaceId: data.workspaceId,
    name: data.name,
    duration: data.duration,
    bufferTime: data.bufferTime ?? 0,
    videoTool: data.videoTool,
    description: data.description,
    bookingToken: generateBookingToken(),
    slug,
    active: data.active ?? true,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (data.bufferBefore !== undefined) docData.bufferBefore = data.bufferBefore;
  if (data.bufferAfter !== undefined) docData.bufferAfter = data.bufferAfter;
  if (data.minimumNotice !== undefined) docData.minimumNotice = data.minimumNotice;
  if (data.dailyLimit !== undefined) docData.dailyLimit = data.dailyLimit;
  if (data.availability) docData.availability = data.availability;
  if (data.bookingQuestions) docData.bookingQuestions = data.bookingQuestions;
  if (data.reminders) docData.reminders = data.reminders;
  if (data.confirmationPage) docData.confirmationPage = data.confirmationPage;
  if (data.redirectUrl) docData.redirectUrl = data.redirectUrl;

  const docRef = await getAdminDb().collection("meeting_types").add(docData);
  return { id: docRef.id, slug };
}

/** Generate a preview slug from a name (no random suffix — for display only) */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "meeting";
}

export async function updateMeetingType(id: string, data: Record<string, unknown>): Promise<void> {
  await getAdminDb().collection("meeting_types").doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteMeetingType(id: string): Promise<void> {
  await getAdminDb().collection("meeting_types").doc(id).delete();
}

/* ── Activity helpers ──────────────────────────────────────────────── */

export async function logMeeting(
  leadId: string,
  workspaceId: string,
  createdBy: string,
  subject: string,
  body: string | null,
  duration?: number
): Promise<void> {
  await getAdminDb().collection("activities").add({
    workspaceId,
    leadId,
    type: "meeting",
    subject,
    body,
    duration: duration || null,
    createdBy,
    createdAt: Timestamp.now(),
  });
}
