import { Timestamp } from "firebase/firestore";
import type {
  User,
  Workspace,
  Lead,
  Conversation,
  Message,
  TimeEntry,
  Notification,
  Activity,
  Meeting,
  PipelineStage,
} from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = Timestamp.now();

function daysAgo(n: number): Timestamp {
  return Timestamp.fromMillis(now.toMillis() - n * 86400000);
}

function hoursAgo(n: number): Timestamp {
  return Timestamp.fromMillis(now.toMillis() - n * 3600000);
}

function futureDays(n: number): Timestamp {
  return Timestamp.fromMillis(now.toMillis() + n * 86400000);
}

function futureHours(n: number): Timestamp {
  return Timestamp.fromMillis(now.toMillis() + n * 3600000);
}

// ─── IDs ──────────────────────────────────────────────────────────────────────

export const DEMO_USER_ID = "demo-user-001";
export const DEMO_WORKSPACE_ID = "demo-workspace-001";

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

const DEMO_PIPELINE_STAGES: PipelineStage[] = [
  { id: "stage-new", name: "New", color: "#6b7280", probability: 10, order: 0 },
  { id: "stage-contacted", name: "Contacted", color: "#3b82f6", probability: 20, order: 1 },
  { id: "stage-qualified", name: "Qualified", color: "#8b5cf6", probability: 40, order: 2 },
  { id: "stage-proposal", name: "Proposal", color: "#f59e0b", probability: 60, order: 3 },
  { id: "stage-negotiation", name: "Negotiation", color: "#f97316", probability: 80, order: 4 },
  { id: "stage-won", name: "Won", color: "#22c55e", probability: 100, order: 5 },
  { id: "stage-lost", name: "Lost", color: "#ef4444", probability: 0, order: 6 },
];

// ─── Demo User ────────────────────────────────────────────────────────────────

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  email: "demo@leadflow.dev",
  displayName: "Sarah Chen",
  photoURL: null,
  role: "owner",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  language: "en",
  currency: "USD",
  notificationPrefs: {
    email: true,
    inApp: true,
    followUpReminders: true,
    digestFrequency: "daily",
  },
  workspaceIds: [DEMO_WORKSPACE_ID],
  activeWorkspaceId: DEMO_WORKSPACE_ID,
  workspaceRoles: { [DEMO_WORKSPACE_ID]: "owner" },
  createdAt: daysAgo(90),
  updatedAt: now,
  lastActiveAt: now,
};

// ─── Demo Workspace ───────────────────────────────────────────────────────────

export const DEMO_WORKSPACE: Workspace = {
  id: DEMO_WORKSPACE_ID,
  name: "Acme Corp CRM",
  logoUrl: null,
  timezone: "America/New_York",
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  weekStart: "monday",
  pipeline: { stages: DEMO_PIPELINE_STAGES },
  customFields: [],
  niches: ["SaaS", "Enterprise", "Consulting"],
  createdAt: daysAgo(90),
  updatedAt: now,
  ownerId: DEMO_USER_ID,
  memberIds: [DEMO_USER_ID, "demo-member-002", "demo-member-003"],
};

// ─── Team Members (for conversations) ─────────────────────────────────────────

interface DemoTeamMember {
  id: string;
  displayName: string;
  email: string;
}

export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  { id: "demo-member-002", displayName: "Marcus Johnson", email: "marcus@acme.dev" },
  { id: "demo-member-003", displayName: "Emily Rodriguez", email: "emily@acme.dev" },
  { id: "demo-member-004", displayName: "David Kim", email: "david@acme.dev" },
];

// ─── Leads (20) ────────────────────────────────────────────────────────────────

const leadFirstNames = [
  "James", "Maria", "Alex", "Sophie", "Robert",
  "Emma", "Lucas", "Olivia", "Ethan", "Ava",
  "Michael", "Isabella", "Daniel", "Mia", "William",
  "Charlotte", "Benjamin", "Amelia", "Henry", "Ella",
];

const leadLastNames = [
  "Thompson", "Garcia", "Martinez", "Johnson", "Williams",
  "Brown", "Davis", "Miller", "Wilson", "Moore",
  "Taylor", "Anderson", "Thomas", "Jackson", "White",
  "Harris", "Martin", "Lewis", "Clark", "Hall",
];

const companies = [
  "TechSphere Inc", "GreenLeaf Analytics", "CloudPeak Software", "DataForge Labs", "NexGen Solutions",
  "BrightPath Consulting", "Quantum Dynamics", "Apex Innovations", "StarLight Media", "Pinnacle Group",
  "NorthStar Technologies", "BlueOcean Ventures", "IronClad Security", "Velocity Systems", "Crestview Partners",
  "Meridian Health", "Alpine Data Corp", "Summit Analytics", "Pioneer Labs", "Horizon Software",
];

const sources = ["Website", "Referral", "LinkedIn", "Cold Email", "Conference", "Partner", "Twitter", "Ad"] as const;

const niches = ["SaaS", "Enterprise", "Consulting", "E-commerce", "Healthcare", "Fintech", "Education", "Real Estate"] as const;

const countries = ["United States", "Canada", "United Kingdom", "Germany", "Australia", "Singapore"] as const;

const tags = ["hot", "long-term", "priority", "vip", "follow-up", "new", "returning", "enterprise", "startup"] as const;

function generateLeads(): Lead[] {
  const statuses = ["New", "New", "New", "Contacted", "Contacted", "Contacted", "Contacted", "Qualified", "Qualified", "Qualified", "Proposal", "Proposal", "Proposal", "Negotiation", "Negotiation", "Negotiation", "Won", "Won", "Lost", "Contacted"];

  return Array.from({ length: 20 }, (_, i) => {
    const createdDays = 1 + Math.floor(Math.random() * 60);
    const updatedDays = Math.floor(Math.random() * createdDays);
    const val = Math.floor(Math.random() * 50000) + 5000;
    const status = statuses[i];

    return {
      id: `demo-lead-${String(i + 1).padStart(3, "0")}`,
      workspaceId: DEMO_WORKSPACE_ID,
      firstName: leadFirstNames[i],
      lastName: leadLastNames[i],
      email: `${leadFirstNames[i].toLowerCase()}.${leadLastNames[i].toLowerCase()}@example.com`,
      phone: i % 3 === 0 ? `+1 (555) ${String(100 + Math.floor(Math.random() * 900)).padStart(3, "0")}-${String(1000 + Math.floor(Math.random() * 9000))}` : null,
      company: companies[i],
      jobTitle: i % 2 === 0 ? "CEO" : i % 3 === 0 ? "VP of Sales" : i % 5 === 0 ? "CTO" : "Director",
      status,
      source: sources[Math.floor(Math.random() * sources.length)],
      niche: niches[Math.floor(Math.random() * niches.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      city: null,
      website: `https://${companies[i].toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      linkedin: i % 2 === 0 ? `https://linkedin.com/in/${leadFirstNames[i].toLowerCase()}${leadLastNames[i].toLowerCase()}` : null,
      value: val,
      currency: "USD",
      assignedTo: i % 3 === 0 ? DEMO_USER_ID : i % 3 === 1 ? "demo-member-002" : "demo-member-003",
      tags: [tags[Math.floor(Math.random() * tags.length)], tags[Math.floor(Math.random() * tags.length)]],
      notes: i % 3 === 0 ? `Met at conference. Interested in ${niches[Math.floor(Math.random() * niches.length)]} solutions.` : null,
      customFields: {},
      socialProfiles: {},
      avatarUrl: null,
      attachments: [],
      createdAt: daysAgo(createdDays),
      updatedAt: daysAgo(updatedDays),
      lastContactedAt: i % 2 === 0 ? daysAgo(Math.floor(Math.random() * 10) + 1) : null,
      nextFollowUpAt: i % 3 === 0 ? futureDays(Math.floor(Math.random() * 7) + 1) : null,
      expectedCloseAt: (status === "Proposal" || status === "Negotiation") ? futureDays(Math.floor(Math.random() * 30) + 15) : null,
      createdBy: DEMO_USER_ID,
      sr: Math.floor(Math.random() * 50) + 50,
    };
  });
}

export const DEMO_LEADS: Lead[] = generateLeads();

// ─── Conversations (3) ────────────────────────────────────────────────────────

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "demo-conv-001",
    workspaceId: DEMO_WORKSPACE_ID,
    type: "member",
    participantIds: [DEMO_USER_ID, "demo-member-002"],
    participantNames: ["Sarah Chen", "Marcus Johnson"],
    lastMessage: "Sounds good, I'll send over the proposal by EOD",
    lastMessageAt: hoursAgo(2),
    unreadCount: 0,
    createdAt: daysAgo(30),
  },
  {
    id: "demo-conv-002",
    workspaceId: DEMO_WORKSPACE_ID,
    type: "member",
    participantIds: [DEMO_USER_ID, "demo-member-003"],
    participantNames: ["Sarah Chen", "Emily Rodriguez"],
    lastMessage: "The pipeline report is ready for review",
    lastMessageAt: hoursAgo(5),
    unreadCount: 2,
    createdAt: daysAgo(20),
  },
  {
    id: "demo-conv-003",
    workspaceId: DEMO_WORKSPACE_ID,
    type: "member",
    participantIds: [DEMO_USER_ID, "demo-member-002", "demo-member-003"],
    participantNames: ["Sarah Chen", "Marcus Johnson", "Emily Rodriguez"],
    groupName: "Sales Team",
    lastMessage: "Great call with TechSphere today!",
    lastMessageAt: hoursAgo(8),
    unreadCount: 1,
    createdAt: daysAgo(45),
  },
];

// ─── Messages ─────────────────────────────────────────────────────────────────

export const DEMO_MESSAGES: Message[] = [
  // conv-001: Sarah & Marcus
  {
    id: "demo-msg-001",
    conversationId: "demo-conv-001",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-002",
    senderName: "Marcus Johnson",
    body: "Hey Sarah, I just finished the initial research on TechSphere. Their budget seems solid — around $50k.",
    deleted: false,
    edited: false,
    readBy: [DEMO_USER_ID],
    createdAt: hoursAgo(4),
  },
  {
    id: "demo-msg-002",
    conversationId: "demo-conv-001",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: DEMO_USER_ID,
    senderName: "Sarah Chen",
    body: "Great work, Marcus. Let's schedule a call with them this week. I think we can close this by end of quarter.",
    deleted: false,
    edited: false,
    readBy: ["demo-member-002"],
    createdAt: hoursAgo(3),
  },
  {
    id: "demo-msg-003",
    conversationId: "demo-conv-001",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-002",
    senderName: "Marcus Johnson",
    body: "Sounds good, I'll send over the proposal by EOD",
    deleted: false,
    edited: false,
    readBy: [DEMO_USER_ID],
    createdAt: hoursAgo(2),
  },

  // conv-002: Sarah & Emily
  {
    id: "demo-msg-004",
    conversationId: "demo-conv-002",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-003",
    senderName: "Emily Rodriguez",
    body: "Hi Sarah! The pipeline report is ready for review. We have 3 new leads this week.",
    deleted: false,
    edited: false,
    readBy: [],
    createdAt: hoursAgo(6),
  },
  {
    id: "demo-msg-005",
    conversationId: "demo-conv-002",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-003",
    senderName: "Emily Rodriguez",
    body: "Also, GreenLeaf Analytics is showing strong interest. They want a demo next Tuesday.",
    deleted: false,
    edited: false,
    readBy: [],
    createdAt: hoursAgo(5),
  },

  // conv-003: Group chat
  {
    id: "demo-msg-006",
    conversationId: "demo-conv-003",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-002",
    senderName: "Marcus Johnson",
    body: "Great call with TechSphere today! They loved the product demo.",
    deleted: false,
    edited: false,
    readBy: [DEMO_USER_ID, "demo-member-003"],
    createdAt: hoursAgo(10),
  },
  {
    id: "demo-msg-007",
    conversationId: "demo-conv-003",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: "demo-member-003",
    senderName: "Emily Rodriguez",
    body: "Awesome! I heard they're looking for an enterprise solution. This could be a big deal.",
    deleted: false,
    edited: false,
    readBy: [DEMO_USER_ID, "demo-member-002"],
    createdAt: hoursAgo(9),
  },
  {
    id: "demo-msg-008",
    conversationId: "demo-conv-003",
    workspaceId: DEMO_WORKSPACE_ID,
    senderId: DEMO_USER_ID,
    senderName: "Sarah Chen",
    body: "Let's prep a custom proposal for them. Marcus, can you draft the technical requirements?",
    deleted: false,
    edited: false,
    readBy: ["demo-member-002", "demo-member-003"],
    createdAt: hoursAgo(8),
  },
];

// ─── Time Entries (5) ─────────────────────────────────────────────────────────

export const DEMO_TIME_ENTRIES: TimeEntry[] = [
  {
    id: "demo-time-001",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-001",
    taskId: null,
    userId: DEMO_USER_ID,
    description: "Discovery call with TechSphere",
    startTime: daysAgo(3),
    endTime: daysAgo(3),
    duration: 3600,
    billable: true,
    hourlyRate: 150,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "demo-time-002",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-005",
    taskId: null,
    userId: DEMO_USER_ID,
    description: "Proposal review — NexGen Solutions",
    startTime: daysAgo(2),
    endTime: daysAgo(2),
    duration: 5400,
    billable: true,
    hourlyRate: 150,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "demo-time-003",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-003",
    taskId: null,
    userId: "demo-member-002",
    description: "Market research — CloudPeak",
    startTime: daysAgo(1),
    endTime: daysAgo(1),
    duration: 7200,
    billable: true,
    hourlyRate: 125,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "demo-time-004",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-008",
    taskId: null,
    userId: "demo-member-003",
    description: "Email sequence design",
    startTime: daysAgo(1),
    endTime: daysAgo(1),
    duration: 2700,
    billable: false,
    hourlyRate: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "demo-time-005",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: null,
    taskId: null,
    userId: DEMO_USER_ID,
    description: "Team standup & planning",
    startTime: daysAgo(0),
    endTime: daysAgo(0),
    duration: 1800,
    billable: false,
    hourlyRate: null,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
];

// ─── Notifications (8) ────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "demo-notif-001",
    userId: DEMO_USER_ID,
    type: "follow_up_due",
    title: "Follow-up Due",
    message: "James Thompson (TechSphere) hasn't been contacted in 5 days",
    leadId: "demo-lead-001",
    taskId: null,
    read: false,
    createdAt: hoursAgo(1),
  },
  {
    id: "demo-notif-002",
    userId: DEMO_USER_ID,
    type: "lead_assigned",
    title: "New Lead Assigned",
    message: "Sophie Johnson has been assigned to you",
    leadId: "demo-lead-004",
    taskId: null,
    read: false,
    createdAt: hoursAgo(3),
  },
  {
    id: "demo-notif-003",
    userId: DEMO_USER_ID,
    type: "task_due",
    title: "Task Due Today",
    message: "Prepare Q2 pipeline forecast report",
    leadId: null,
    taskId: null,
    read: false,
    createdAt: hoursAgo(5),
  },
  {
    id: "demo-notif-004",
    userId: DEMO_USER_ID,
    type: "automation_triggered",
    title: "Automation: Welcome Email Sent",
    message: "Welcome email sent to Emma Brown (GreenLeaf Analytics)",
    leadId: "demo-lead-006",
    taskId: null,
    read: false,
    createdAt: hoursAgo(6),
  },
  {
    id: "demo-notif-005",
    userId: DEMO_USER_ID,
    type: "mention",
    title: "Marcus mentioned you",
    message: "Marcus Johnson mentioned you in Sales Team conversation",
    leadId: null,
    taskId: null,
    read: false,
    createdAt: hoursAgo(8),
  },
  {
    id: "demo-notif-006",
    userId: DEMO_USER_ID,
    type: "follow_up_due",
    title: "Follow-up Reminder",
    message: "Robert Williams (DataForge) — next step: send case study",
    leadId: "demo-lead-005",
    taskId: null,
    read: true,
    createdAt: daysAgo(1),
  },
  {
    id: "demo-notif-007",
    userId: DEMO_USER_ID,
    type: "system",
    title: "Weekly Summary",
    message: "You had 12 lead interactions this week, 3 deals progressed",
    leadId: null,
    taskId: null,
    read: true,
    createdAt: daysAgo(2),
  },
  {
    id: "demo-notif-008",
    userId: DEMO_USER_ID,
    type: "lead_assigned",
    title: "Lead Reassigned",
    message: "Alex Martinez has been reassigned to Emily Rodriguez",
    leadId: "demo-lead-003",
    taskId: null,
    read: true,
    createdAt: daysAgo(3),
  },
];

// ─── Activities ───────────────────────────────────────────────────────────────

export function getDemoActivities(leadId: string): Activity[] {
  return [
    {
      id: `demo-act-${leadId}-001`,
      workspaceId: DEMO_WORKSPACE_ID,
      leadId,
      type: "note",
      subject: "Initial contact",
      body: "Reached out via LinkedIn. Lead responded positively.",
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(15),
    },
    {
      id: `demo-act-${leadId}-002`,
      workspaceId: DEMO_WORKSPACE_ID,
      leadId,
      type: "email",
      subject: "Follow-up email sent",
      body: "Sent product overview and pricing information.",
      direction: "outbound",
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(10),
    },
    {
      id: `demo-act-${leadId}-003`,
      workspaceId: DEMO_WORKSPACE_ID,
      leadId,
      type: "call",
      subject: "Discovery call completed",
      body: "30-minute discovery call. Discussed their needs and timeline.",
      duration: 1800,
      direction: "outbound",
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(5),
    },
  ];
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const DEMO_MEETINGS: Meeting[] = [
  {
    id: "demo-meeting-001",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-001",
    title: "TechSphere Discovery Call",
    description: "Initial discovery with James Thompson",
    startTime: futureHours(4),
    endTime: futureHours(5),
    timezone: "America/New_York",
    attendees: [
      { email: "james.thompson@example.com", name: "James Thompson" },
      { email: DEMO_USER.email, name: DEMO_USER.displayName },
    ],
    conferencingTool: "google_meet",
    googleMeetLink: "https://meet.google.com/abc-defg-hij",
    calendarEventId: "demo-cal-001",
    status: "scheduled",
    meetingType: "scheduled",
    createdBy: DEMO_USER_ID,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "demo-meeting-002",
    workspaceId: DEMO_WORKSPACE_ID,
    leadId: "demo-lead-006",
    title: "GreenLeaf Analytics Demo",
    description: "Product demo for Emma Brown",
    startTime: futureDays(2),
    endTime: futureDays(2),
    timezone: "America/New_York",
    attendees: [
      { email: "emma.brown@example.com", name: "Emma Brown" },
      { email: DEMO_USER.email, name: DEMO_USER.displayName },
    ],
    conferencingTool: "google_meet",
    googleMeetLink: "https://meet.google.com/xyz-uvw-rst",
    calendarEventId: "demo-cal-002",
    status: "scheduled",
    meetingType: "scheduled",
    createdBy: DEMO_USER_ID,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

// ─── Analytics Stats ──────────────────────────────────────────────────────────

export const DEMO_STATS = {
  total: 20,
  byStatus: {
    "New": 3,
    "Contacted": 5,
    "Qualified": 3,
    "Proposal": 3,
    "Negotiation": 3,
    "Won": 2,
    "Lost": 1,
  },
  totalValue: 458000,
  forecastedRevenue: 215000,
};

// ─── Mutable Store (for writes in demo mode) ──────────────────────────────────

/**
 * This is the single source of truth for mock data that can be mutated
 * during a demo session. Components use these arrays instead of Firestore.
 */
export class DemoStore {
  leads: Lead[] = [...DEMO_LEADS];
  conversations: Conversation[] = [...DEMO_CONVERSATIONS];
  messages: Message[] = [...DEMO_MESSAGES];
  timeEntries: TimeEntry[] = [...DEMO_TIME_ENTRIES];
  notifications: Notification[] = [...DEMO_NOTIFICATIONS];
  meetings: Meeting[] = [...DEMO_MEETINGS];

  private _convMessageIndex: Map<string, Message[]> = new Map();
  private _notifListeners: Set<(notifications: Notification[]) => void> = new Set();

  constructor() {
    this._buildIndex();
  }

  private _buildIndex() {
    this._convMessageIndex.clear();
    for (const msg of this.messages) {
      const list = this._convMessageIndex.get(msg.conversationId) || [];
      list.push(msg);
      this._convMessageIndex.set(msg.conversationId, list);
    }
  }

  // ── Lead Operations ──

  getAllLeads(): Lead[] {
    return [...this.leads];
  }

  getLeadsByStatus(status: string): Lead[] {
    return this.leads.filter((l) => l.status === status);
  }

  getLead(id: string): Lead | undefined {
    return this.leads.find((l) => l.id === id);
  }

  addLead(lead: Lead): void {
    this.leads.unshift(lead);
  }

  updateLead(id: string, data: Partial<Lead>): void {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.leads[idx] = { ...this.leads[idx], ...data, updatedAt: Timestamp.now() };
    }
  }

  deleteLead(id: string): void {
    this.leads = this.leads.filter((l) => l.id !== id);
  }

  deleteLeads(ids: string[]): void {
    this.leads = this.leads.filter((l) => !ids.includes(l.id));
  }

  getLeadStats() {
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    for (const lead of this.leads) {
      const status = lead.status || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalValue += lead.value || 0;
    }
    return { total: this.leads.length, byStatus, totalValue };
  }

  // ── Conversation Operations ──

  getConversations(): Conversation[] {
    return [...this.conversations].sort((a, b) =>
      b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis()
    );
  }

  getMessages(conversationId: string): Message[] {
    return [...(this._convMessageIndex.get(conversationId) || [])].sort(
      (a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
    );
  }

  sendMessage(msg: Message): void {
    this.messages.push(msg);
    const list = this._convMessageIndex.get(msg.conversationId) || [];
    list.push(msg);
    this._convMessageIndex.set(msg.conversationId, list);

    // Update conversation last message
    const conv = this.conversations.find((c) => c.id === msg.conversationId);
    if (conv) {
      conv.lastMessage = msg.body.slice(0, 100);
      conv.lastMessageAt = msg.createdAt || Timestamp.now();
      conv.unreadCount += 1;
    }
  }

  // ── Time Entry Operations ──

  getTimeEntries(): TimeEntry[] {
    return [...this.timeEntries];
  }

  addTimeEntry(entry: TimeEntry): void {
    this.timeEntries.unshift(entry);
  }

  deleteTimeEntry(id: string): void {
    this.timeEntries = this.timeEntries.filter((e) => e.id !== id);
  }

  // ── Notification Operations ──

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  subscribeToNotifications(callback: (notifications: Notification[]) => void): () => void {
    this._notifListeners.add(callback);
    callback([...this.notifications]);
    return () => {
      this._notifListeners.delete(callback);
    };
  }

  markNotifRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    this._notifyNotifListeners();
  }

  markAllNotifsRead(): void {
    for (const n of this.notifications) n.read = true;
    this._notifyNotifListeners();
  }

  private _notifyNotifListeners() {
    for (const cb of this._notifListeners) {
      cb([...this.notifications]);
    }
  }
}

// Singleton — shared across all demo sessions
export const demoStore = new DemoStore();
