import { db } from "@/lib/firebase/client";
import type {
  Conversation,
  Invoice,
  Meeting,
  Message,
  Project,
  TimeEntry,
} from "@/types";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  dueDate: Date | null;
  progress: number;
  priority: string;
}

export async function fetchClientProjects(
  workspaceId: string,
  userId: string,
  max = 50
): Promise<ProjectSummary[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore
      .getProjects()
      .filter(
        (p: Project) =>
          p.clients?.includes(userId) && p.workspaceId === workspaceId
      )
      .slice(0, max)
      .map((p: Project) => ({
        id: p.id,
        name: p.name || "Untitled Project",
        status: p.status || "active",
        dueDate: p.dueDate?.toDate() ?? null,
        progress: p.progress ?? 0,
        priority: p.priority || "medium",
      }));
  }
  const ref = collection(db, "projects");
  const q = query(
    ref,
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  const results: ProjectSummary[] = [];
  snap.forEach((d) => {
    const data = d.data() as Project;
    if (data.clients?.includes(userId)) {
      results.push({
        id: d.id,
        name: data.name || "Untitled Project",
        status: data.status || "active",
        dueDate: data.dueDate?.toDate() ?? null,
        progress: data.progress ?? 0,
        priority: data.priority || "medium",
      });
    }
  });
  return results;
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export interface MeetingSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  googleMeetLink: string;
  status: string;
  attendees: { email: string; name: string }[];
}

export async function fetchClientMeetings(
  workspaceId: string,
  userEmail: string,
  max = 50
): Promise<MeetingSummary[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.meetings
      .filter(
        (m: Meeting) =>
          m.workspaceId === workspaceId &&
          m.status !== "cancelled" &&
          (m.attendees || []).some(
            (a) => a.email?.toLowerCase() === userEmail.toLowerCase()
          )
      )
      .slice(0, max)
      .map((m: Meeting) => ({
        id: m.id,
        title: m.title || "Untitled Meeting",
        startTime: m.startTime?.toDate() ?? new Date(),
        endTime: m.endTime?.toDate() ?? new Date(),
        googleMeetLink: m.googleMeetLink || "",
        status: m.status || "scheduled",
        attendees: m.attendees || [],
      }));
  }
  const ref = collection(db, "meetings");
  const q = query(
    ref,
    where("workspaceId", "==", workspaceId),
    orderBy("startTime", "asc"),
    limit(max)
  );
  const snap = await getDocs(q);
  const now = Date.now();
  const results: MeetingSummary[] = [];
  snap.forEach((d) => {
    const data = d.data() as Meeting;
    const startTime = data.startTime?.toDate() ?? new Date();
    const attendees = data.attendees || [];
    const isAttendee = attendees.some(
      (a) => a.email?.toLowerCase() === userEmail.toLowerCase()
    );
    if (isAttendee && data.status !== "cancelled") {
      results.push({
        id: d.id,
        title: data.title || "Untitled Meeting",
        startTime,
        endTime: data.endTime?.toDate() ?? new Date(),
        googleMeetLink: data.googleMeetLink || "",
        status: data.status || "scheduled",
        attendees,
      });
    }
  });
  return results;
}

// ─── Conversations & Messages ────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export async function fetchClientConversations(
  workspaceId: string,
  userId: string,
  max = 20
): Promise<ConversationSummary[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.conversations
      .filter(
        (c: Conversation) =>
          c.workspaceId === workspaceId &&
          (c.participantIds || []).includes(userId)
      )
      .slice(0, max)
      .map((c: Conversation) => ({
        id: c.id,
        participantIds: c.participantIds || [],
        participantNames: c.participantNames || [],
        lastMessage: c.lastMessage || "",
        lastMessageAt: (c.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
        unreadCount: c.unreadCount || 0,
      }));
  }
  const ref = collection(db, "conversations");
  const q = query(
    ref,
    where("workspaceId", "==", workspaceId),
    orderBy("lastMessageAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  const results: ConversationSummary[] = [];
  snap.forEach((d) => {
    const data = d.data() as Conversation;
    const pIds = data.participantIds || [];
    if (pIds.includes(userId)) {
      results.push({
        id: d.id,
        participantIds: pIds,
        participantNames: data.participantNames || [],
        lastMessage: data.lastMessage || "",
        lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
        unreadCount: data.unreadCount || 0,
      });
    }
  });
  return results;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  paidDate: Date | null;
}

export async function fetchClientInvoices(
  workspaceId: string,
  userId: string,
  max = 50
): Promise<InvoiceSummary[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore
      .getInvoices()
      .filter(
        (inv: Invoice) =>
          inv.workspaceId === workspaceId && inv.clientId === userId
      )
      .slice(0, max)
      .map((inv: Invoice) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || "N/A",
        status: inv.status || "draft",
        total: inv.total || 0,
        currency: inv.currency || "USD",
        issueDate: inv.issueDate?.toDate() ?? new Date(),
        dueDate: inv.dueDate?.toDate() ?? new Date(),
        paidDate: inv.paidDate?.toDate() ?? null,
      }));
  }
  const ref = collection(db, "invoices");
  const q = query(
    ref,
    where("workspaceId", "==", workspaceId),
    where("clientId", "==", userId),
    orderBy("dueDate", "asc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Invoice;
    return {
      id: d.id,
      invoiceNumber: data.invoiceNumber || "N/A",
      status: data.status || "draft",
      total: data.total || 0,
      currency: data.currency || "USD",
      issueDate: data.issueDate?.toDate() ?? new Date(),
      dueDate: data.dueDate?.toDate() ?? new Date(),
      paidDate: data.paidDate?.toDate() ?? null,
    };
  });
}

// ─── Time Entries ────────────────────────────────────────────────────────────

export interface TimeEntrySummary {
  id: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  billable: boolean;
  createdAt: Date;
}

export async function fetchClientTimeEntries(
  workspaceId: string,
  userId: string,
  max = 50
): Promise<TimeEntrySummary[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.timeEntries
      .filter(
        (te: TimeEntry) =>
          te.workspaceId === workspaceId && te.userId === userId
      )
      .slice(0, max)
      .map((te: TimeEntry) => ({
        id: te.id,
        description: te.description || "",
        startTime: te.startTime?.toDate() ?? new Date(),
        endTime: te.endTime?.toDate() ?? null,
        duration: te.duration || 0,
        billable: te.billable ?? true,
        createdAt: te.createdAt?.toDate() ?? new Date(),
      }));
  }
  const ref = collection(db, "timeEntries");
  const q = query(
    ref,
    where("workspaceId", "==", workspaceId),
    where("userId", "==", userId),
    orderBy("startTime", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as TimeEntry;
    return {
      id: d.id,
      description: data.description || "",
      startTime: data.startTime?.toDate() ?? new Date(),
      endTime: data.endTime?.toDate() ?? null,
      duration: data.duration || 0,
      billable: data.billable ?? true,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    };
  });
}
