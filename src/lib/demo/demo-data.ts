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
  Project,
  ProjectTask,
  ProjectMilestone,
  ProjectNote,
  Invoice,
  InvoiceLineItem,
  InvoiceDiscount,
  Document,
  Contract,
  ContractTemplate,
  ContractSigner,
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
    body: "Hey Sarah, I just finished the initial research on TechSphere. Their budget seems solid - around $50k.",
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
    description: "Proposal review - NexGen Solutions",
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
    description: "Market research - CloudPeak",
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
    message: "Robert Williams (DataForge) - next step: send case study",
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

// ─── Invoice Demo Data ─────────────────────────────────────────────────────────

const DEMO_INVOICES: Invoice[] = [
  {
    id: "demo-inv-001",
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "demo-client-001",
    projectId: "demo-project-001",
    invoiceNumber: "INV-2026-001",
    status: "paid",
    lineItems: [
      { description: "Website Design - Homepage", quantity: 1, unitPrice: 5000, total: 5000 },
      { description: "Website Design - Inner Pages (x5)", quantity: 5, unitPrice: 800, total: 4000 },
      { description: "Development & Integration", quantity: 1, unitPrice: 6000, total: 6000 },
    ],
    subtotal: 15000,
    taxRate: 10,
    taxAmount: 1500,
    discount: null,
    paymentProof: null,
    total: 16500,
    currency: "USD",
    issueDate: daysAgo(45),
    dueDate: daysAgo(15),
    paidDate: daysAgo(10),
    notes: "Full payment received",
    pdfUrl: null,
    createdBy: DEMO_USER_ID,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(10),
  },
  {
    id: "demo-inv-002",
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "demo-client-001",
    projectId: "demo-project-001",
    invoiceNumber: "INV-2026-002",
    status: "sent",
    lineItems: [
      { description: "Monthly Maintenance - June", quantity: 1, unitPrice: 2000, total: 2000 },
      { description: "Hosting Services - Q2", quantity: 3, unitPrice: 150, total: 450 },
    ],
    subtotal: 2450,
    taxRate: 0,
    taxAmount: 0,
    total: 2450,
    currency: "USD",
    issueDate: daysAgo(5),
    dueDate: daysAgo(25),
    paidDate: null,
    discount: null,
    paymentProof: null,
    notes: "Due within 30 days",
    pdfUrl: null,
    createdBy: DEMO_USER_ID,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "demo-inv-003",
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "demo-client-002",
    projectId: "demo-project-002",
    invoiceNumber: "INV-2026-003",
    status: "draft",
    lineItems: [
      { description: "Analytics Dashboard - Phase 1", quantity: 1, unitPrice: 12000, total: 12000 },
    ],
    subtotal: 12000,
    taxRate: 10,
    taxAmount: 1200,
    total: 13200,
    currency: "USD",
    issueDate: daysAgo(1),
    dueDate: daysAgo(-29),
    paidDate: null,
    discount: null,
    paymentProof: null,
    notes: "Draft - not yet sent",
    pdfUrl: null,
    createdBy: DEMO_USER_ID,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

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
  private _invoices: Invoice[] = [...DEMO_INVOICES];
  private _contracts: Contract[] = [];
  private _templates: ContractTemplate[] = [];

  private _convMessageIndex: Map<string, Message[]> = new Map();
  private _notifListeners: Set<(notifications: Notification[]) => void> = new Set();
  private _convListeners: Set<(conversations: Conversation[]) => void> = new Set();
  private _lastConvId = 100;
  private _lastMsgId = 100;

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

  subscribeToConversations(callback: (conversations: Conversation[]) => void): () => void {
    this._convListeners.add(callback);
    callback(this.getConversations());
    return () => {
      this._convListeners.delete(callback);
    };
  }

  private _notifyConvListeners() {
    const convs = this.getConversations();
    for (const cb of this._convListeners) {
      cb(convs);
    }
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
    this._notifyConvListeners();
  }

  createConversation(data: {
    workspaceId: string;
    type: "lead" | "member";
    leadId?: string;
    leadName?: string;
    leadEmail?: string;
    participantIds?: string[];
    participantNames?: string[];
  }): string {
    this._lastConvId++;
    const id = `demo-conv-${this._lastConvId}`;
    const conv: Conversation = {
      id,
      workspaceId: data.workspaceId,
      type: data.type,
      leadId: data.leadId || "",
      leadName: data.leadName || "",
      leadEmail: data.leadEmail || "",
      participantIds: data.participantIds || [],
      participantNames: data.participantNames || [],
      lastMessage: "",
      lastMessageAt: Timestamp.now(),
      unreadCount: 0,
      createdAt: Timestamp.now(),
    };
    this.conversations.unshift(conv);
    this._notifyConvListeners();
    return id;
  }

  // ── Meeting Operations ──

  getMeetings(): Meeting[] {
    return [...this.meetings].sort(
      (a, b) => a.startTime.toMillis() - b.startTime.toMillis()
    );
  }

  addMeeting(meeting: Meeting): void {
    this.meetings.push(meeting);
  }

  updateMeeting(id: string, data: Partial<Meeting>): void {
    const idx = this.meetings.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.meetings[idx] = { ...this.meetings[idx], ...data, updatedAt: Timestamp.now() };
    }
  }

  cancelMeeting(id: string): void {
    this.updateMeeting(id, { status: "cancelled" });
  }

  // ── Member/Client Operations ──

  getWorkspaceMembers() {
    return [
      {
        userId: DEMO_USER_ID,
        email: DEMO_USER.email,
        displayName: DEMO_USER.displayName,
        photoURL: null,
        role: "owner" as const,
        joinedAt: daysAgo(90),
      },
      {
        userId: "demo-member-002",
        email: "marcus@acme.dev",
        displayName: "Marcus Johnson",
        photoURL: null,
        role: "member" as const,
        joinedAt: daysAgo(85),
      },
      {
        userId: "demo-member-003",
        email: "emily@acme.dev",
        displayName: "Emily Rodriguez",
        photoURL: null,
        role: "member" as const,
        joinedAt: daysAgo(80),
      },
    ];
  }

  getClients() {
    return [
      {
        userId: "demo-client-001",
        email: "james.thompson@example.com",
        displayName: "James Thompson",
        photoURL: null,
        joinedAt: "Apr 15, 2026",
        projectCount: 2,
      },
      {
        userId: "demo-client-002",
        email: "emma.brown@example.com",
        displayName: "Emma Brown",
        photoURL: null,
        joinedAt: "May 1, 2026",
        projectCount: 1,
      },
      {
        userId: "demo-client-003",
        email: "robert.williams@example.com",
        displayName: "Robert Williams",
        photoURL: null,
        joinedAt: "May 20, 2026",
        projectCount: 0,
      },
    ];
  }

  private _projects: Project[] = [
    {
      id: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      name: "TechSphere Onboarding",
      description: "Full onboarding campaign for TechSphere including email sequences and landing pages.",
      status: "active",
      clients: ["demo-client-001"],
      projectClients: [
        { clientId: "demo-client-001", isMainContact: true, addedAt: daysAgo(30), addedBy: DEMO_USER_ID, clientNotes: "" },
      ],
      memberIds: [DEMO_USER_ID, "demo-member-002"],
      serviceIds: [],
      leadId: null,
      startDate: daysAgo(30),
      dueDate: daysAgo(-14),
      completedDate: null,
      progress: 65,
      manualProgress: null,
      isManualProgress: false,
      priority: "high",
      budget: 15000,
      currency: "USD",
      customFields: {},
      linksAndEmbeds: [],
      deliveryFlowSettings: {
        enableFeedback: true, enableReferrals: true, enableReviews: true, enableUpsell: true,
        referralMessage: "", reviewPlatforms: [], reviewMessage: "", onlyAsk5Star: true,
        upsellMessage: "", upsellServices: [],
      },
      hasFinalPackage: false, finalPackageDelivered: false, finalPackageDeliveredAt: null,
      showFinalPackageBanner: false,
      visibility: "Public", isArchive: false, archivedAt: null, archivedReason: null,
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
    {
      id: "demo-project-002",
      workspaceId: DEMO_WORKSPACE_ID,
      name: "GreenLeaf Analytics Suite",
      description: "Building a custom analytics dashboard for GreenLeaf with real-time reporting.",
      status: "active",
      clients: ["demo-client-001", "demo-client-002"],
      projectClients: [
        { clientId: "demo-client-001", isMainContact: true, addedAt: daysAgo(14), addedBy: DEMO_USER_ID, clientNotes: "" },
        { clientId: "demo-client-002", isMainContact: false, addedAt: daysAgo(14), addedBy: DEMO_USER_ID, clientNotes: "" },
      ],
      memberIds: [DEMO_USER_ID, "demo-member-003"],
      serviceIds: [],
      leadId: null,
      startDate: daysAgo(14),
      dueDate: daysAgo(-45),
      completedDate: null,
      progress: 30,
      manualProgress: null,
      isManualProgress: false,
      priority: "medium",
      budget: 25000,
      currency: "USD",
      customFields: {},
      linksAndEmbeds: [],
      deliveryFlowSettings: {
        enableFeedback: true, enableReferrals: true, enableReviews: true, enableUpsell: true,
        referralMessage: "", reviewPlatforms: [], reviewMessage: "", onlyAsk5Star: true,
        upsellMessage: "", upsellServices: [],
      },
      hasFinalPackage: false, finalPackageDelivered: false, finalPackageDeliveredAt: null,
      showFinalPackageBanner: false,
      visibility: "Public", isArchive: false, archivedAt: null, archivedReason: null,
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(0),
    },
  ];

  // ── Demo Tasks ─────────────────────────────────────────────────────────────

  private _tasks: ProjectTask[] = [
    {
      id: "demo-task-001",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      taskName: "Design landing page mockups",
      description: "Create 3 mockup variants for the TechSphere landing page.",
      assigneeId: "demo-member-002",
      parentTaskId: null,
      milestoneId: null,
      isSubtask: false,
      hasSubtasks: true,
      status: { parent: "In Progress", name: "In Progress", color: "#E3F2FD" },
      priority: "high",
      startDate: daysAgo(25),
      dueDate: daysAgo(-5),
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: "Public",
      order: 1000,
      isMilestone: false,
      completedAt: null,
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
    {
      id: "demo-task-002",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      taskName: "Homepage hero section",
      description: "Design the main hero for the landing page.",
      assigneeId: DEMO_USER_ID,
      parentTaskId: "demo-task-001",
      milestoneId: null,
      isSubtask: true,
      hasSubtasks: false,
      status: { parent: "Complete", name: "Complete", color: "#E8F5E9" },
      priority: "high",
      startDate: daysAgo(24),
      dueDate: daysAgo(-10),
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: "Public",
      order: 1000,
      isMilestone: false,
      completedAt: daysAgo(10),
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(24),
      updatedAt: daysAgo(10),
      isDeleted: false,
    },
    {
      id: "demo-task-003",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      taskName: "Features section with icons",
      description: "Design the features grid with custom icons.",
      assigneeId: "demo-member-002",
      parentTaskId: "demo-task-001",
      milestoneId: null,
      isSubtask: true,
      hasSubtasks: false,
      status: { parent: "To Do", name: "Not Started", color: "#F5EFCF" },
      priority: "medium",
      startDate: daysAgo(24),
      dueDate: daysAgo(-3),
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: "Public",
      order: 2000,
      isMilestone: false,
      completedAt: null,
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(24),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
    {
      id: "demo-task-004",
      projectId: "demo-project-002",
      workspaceId: DEMO_WORKSPACE_ID,
      taskName: "Set up data pipeline",
      description: "Configure Firestore triggers for real-time analytics sync.",
      assigneeId: "demo-member-003",
      parentTaskId: null,
      milestoneId: null,
      isSubtask: false,
      hasSubtasks: false,
      status: { parent: "To Do", name: "Not Started", color: "#F5EFCF" },
      priority: "high",
      startDate: daysAgo(14),
      dueDate: daysAgo(-30),
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: "Public",
      order: 1000,
      isMilestone: false,
      completedAt: null,
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
    {
      id: "demo-task-005",
      projectId: "demo-project-002",
      workspaceId: DEMO_WORKSPACE_ID,
      taskName: "Build dashboard charts",
      description: "Implement Recharts components for the analytics dashboard.",
      assigneeId: null,
      parentTaskId: null,
      milestoneId: null,
      isSubtask: false,
      hasSubtasks: false,
      status: { parent: "To Do", name: "Not Started", color: "#F5EFCF" },
      priority: "medium",
      startDate: null,
      dueDate: null,
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: "Public",
      order: 2000,
      isMilestone: false,
      completedAt: null,
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
  ];

  // ── Demo Milestones ────────────────────────────────────────────────────────

  private _milestones: ProjectMilestone[] = [
    {
      id: "demo-milestone-001",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      milestoneName: "Design Phase Complete",
      description: "All design mockups approved by client.",
      dueDate: daysAgo(-8),
      status: "Pending",
      order: 0,
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(28),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
    {
      id: "demo-milestone-002",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      milestoneName: "Client Launch",
      description: "Final deliverable handoff to TechSphere.",
      dueDate: daysAgo(-14),
      status: "Pending",
      order: 1,
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(28),
      updatedAt: daysAgo(1),
      isDeleted: false,
    },
  ];

  // ── Demo Notes ─────────────────────────────────────────────────────────────

  private _notes: ProjectNote[] = [
    {
      id: "demo-note-001",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      taskId: null,
      title: "Client meeting notes",
      content: "James requested a darker color scheme. Will prepare updated mockups for review on Thursday.",
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
      isDeleted: false,
    },
    {
      id: "demo-note-002",
      projectId: "demo-project-001",
      workspaceId: DEMO_WORKSPACE_ID,
      taskId: "demo-task-001",
      title: "Design feedback",
      content: "Emily suggested adding hover animations to feature cards. Let's prototype this before finalizing.",
      createdBy: "demo-member-002",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
      isDeleted: false,
    },
  ];

  getProjects(): Project[] {
    return [...this._projects];
  }

  getProject(id: string): Project | null {
    return this._projects.find((p) => p.id === id) ?? null;
  }

  createProject(workspaceId: string, userId: string, data: Record<string, unknown>): string {
    const id = `demo-project-${Date.now()}`;
    const newClients = (data.clients as string[]) || [];
    const newProjectClients = (data.projectClients as Array<{ clientId: string; isMainContact?: boolean; clientNotes?: string }>) || [];
    // Convert simple client IDs to projectClients format if not already provided
    const projectClients = newProjectClients.length > 0
      ? newProjectClients.map((pc) => ({
          clientId: pc.clientId,
          isMainContact: pc.isMainContact || false,
          addedAt: Timestamp.now(),
          addedBy: userId,
          clientNotes: pc.clientNotes || "",
        }))
      : newClients.map((cid) => ({
          clientId: cid,
          isMainContact: false,
          addedAt: Timestamp.now(),
          addedBy: userId,
          clientNotes: "",
        }));

    const project: Project = {
      id,
      workspaceId,
      name: data.name as string,
      description: (data.description as string) || null,
      status: (data.status as Project["status"]) || "active",
      clients: newClients,
      projectClients,
      memberIds: (data.memberIds as string[]) || [],
      serviceIds: (data.serviceIds as string[]) || [],
      leadId: null,
      startDate: (data.startDate as Timestamp) || null,
      dueDate: (data.dueDate as Timestamp) || null,
      completedDate: null,
      progress: 0,
      manualProgress: null,
      isManualProgress: false,
      priority: (data.priority as Project["priority"]) || "medium",
      budget: (data.budget as number) || null,
      currency: (data.currency as string) || "USD",
      customFields: {},
      linksAndEmbeds: [],
      deliveryFlowSettings: {
        enableFeedback: true, enableReferrals: true, enableReviews: true, enableUpsell: true,
        referralMessage: "", reviewPlatforms: [], reviewMessage: "", onlyAsk5Star: true,
        upsellMessage: "", upsellServices: [],
      },
      hasFinalPackage: false, finalPackageDelivered: false, finalPackageDeliveredAt: null,
      showFinalPackageBanner: false,
      visibility: "Public", isArchive: false, archivedAt: null, archivedReason: null,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    this._projects.unshift(project);
    return id;
  }

  updateProject(id: string, data: Record<string, unknown>): void {
    const idx = this._projects.findIndex((p) => p.id === id);
    if (idx === -1) return;
    this._projects[idx] = { ...this._projects[idx], ...data, updatedAt: Timestamp.now() } as Project;
  }

  deleteProject(id: string): void {
    this._projects = this._projects.filter((p) => p.id !== id);
  }

  // ── Project Task Operations ──

  getProjectTasks(projectId: string): ProjectTask[] {
    return this._tasks.filter((t) => t.projectId === projectId && !t.isDeleted);
  }

  getProjectTask(id: string): ProjectTask | null {
    return this._tasks.find((t) => t.id === id && !t.isDeleted) ?? null;
  }

  createProjectTask(projectId: string, workspaceId: string, data: Record<string, unknown>): string {
    const id = `demo-task-${Date.now()}`;
    const parentTaskId = (data.parentTaskId as string) || null;
    const task: ProjectTask = {
      id,
      projectId,
      workspaceId,
      taskName: data.taskName as string,
      description: (data.description as string) || null,
      assigneeId: (data.assigneeId as string) || null,
      parentTaskId,
      milestoneId: (data.milestoneId as string) || null,
      isSubtask: !!parentTaskId,
      hasSubtasks: false,
      status: { parent: "To Do", name: "Not Started", color: "#F5EFCF" },
      priority: (data.priority as ProjectTask["priority"]) || null,
      startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : (data.startDate as Timestamp) || null,
      dueDate: data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : (data.dueDate as Timestamp) || null,
      startDateDays: null, dueDateDays: null,
      startDateReference: null, dueDateReference: null,
      recurring: false, recurringDetails: null, weekDays: [],
      visibility: (data.visibility as ProjectTask["visibility"]) || "Public",
      order: 0,
      isMilestone: (data.isMilestone as boolean) || false,
      completedAt: null,
      customFields: {},
      files: [],
      createdBy: DEMO_USER_ID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isDeleted: false,
    };
    this._tasks.unshift(task);
    return id;
  }

  updateProjectTask(id: string, data: Record<string, unknown>): void {
    const idx = this._tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const updated = { ...this._tasks[idx], ...data, updatedAt: Timestamp.now() } as ProjectTask;
    if (data.status && typeof data.status === "object" && (data.status as { parent: string }).parent === "Complete") {
      updated.completedAt = Timestamp.now();
    }
    this._tasks[idx] = updated;
  }

  deleteProjectTask(id: string): void {
    const idx = this._tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    this._tasks[idx] = { ...this._tasks[idx], isDeleted: true, updatedAt: Timestamp.now() };
  }

  // ── Project Milestone Operations ──

  getProjectMilestones(projectId: string): ProjectMilestone[] {
    return this._milestones.filter((m) => m.projectId === projectId && !m.isDeleted);
  }

  createProjectMilestone(projectId: string, workspaceId: string, data: Record<string, unknown>): string {
    const id = `demo-milestone-${Date.now()}`;
    const milestone: ProjectMilestone = {
      id,
      projectId,
      workspaceId,
      milestoneName: data.milestoneName as string,
      description: (data.description as string) || null,
      dueDate: data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : (data.dueDate as Timestamp) || null,
      status: "Pending",
      order: 0,
      createdBy: DEMO_USER_ID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isDeleted: false,
    };
    this._milestones.unshift(milestone);
    return id;
  }

  updateProjectMilestone(id: string, data: Record<string, unknown>): void {
    const idx = this._milestones.findIndex((m) => m.id === id);
    if (idx === -1) return;
    this._milestones[idx] = { ...this._milestones[idx], ...data, updatedAt: Timestamp.now() } as ProjectMilestone;
  }

  deleteProjectMilestone(id: string): void {
    const idx = this._milestones.findIndex((m) => m.id === id);
    if (idx === -1) return;
    this._milestones[idx] = { ...this._milestones[idx], isDeleted: true, updatedAt: Timestamp.now() };
  }

  // ── Project Note Operations ──

  getProjectNotes(projectId: string): ProjectNote[] {
    return this._notes.filter((n) => n.projectId === projectId && !n.isDeleted);
  }

  createProjectNote(projectId: string, workspaceId: string, data: Record<string, unknown>): string {
    const id = `demo-note-${Date.now()}`;
    const note: ProjectNote = {
      id,
      projectId,
      workspaceId,
      taskId: (data.taskId as string) || null,
      title: data.title as string,
      content: data.content as string,
      createdBy: DEMO_USER_ID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isDeleted: false,
    };
    this._notes.unshift(note);
    return id;
  }

  updateProjectNote(id: string, data: Record<string, unknown>): void {
    const idx = this._notes.findIndex((n) => n.id === id);
    if (idx === -1) return;
    this._notes[idx] = { ...this._notes[idx], ...data, updatedAt: Timestamp.now() } as ProjectNote;
  }

  deleteProjectNote(id: string): void {
    const idx = this._notes.findIndex((n) => n.id === id);
    if (idx === -1) return;
    this._notes[idx] = { ...this._notes[idx], isDeleted: true, updatedAt: Timestamp.now() };
  }

  // ── Invoice Operations ──

  getInvoices(): Invoice[] {
    return [...this._invoices];
  }

  getInvoice(id: string): Invoice | null {
    return this._invoices.find((inv) => inv.id === id) ?? null;
  }

  createInvoice(workspaceId: string, userId: string, data: Record<string, unknown>): string {
    const id = `demo-inv-${Date.now()}`;
    const lineItems = (data.lineItems as InvoiceLineItem[]) || [];
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = (data.taxRate as number) ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const discount = (data.discount as InvoiceDiscount) || null;

    let discountAmount = 0;
    if (discount && discount.amount > 0) {
      if (discount.type === "percentage") {
        discountAmount = subtotal * (discount.amount / 100);
      } else {
        discountAmount = Math.min(discount.amount, subtotal + taxAmount);
      }
    }
    const total = subtotal + taxAmount - discountAmount;

    const invoice: Invoice = {
      id,
      workspaceId,
      clientId: data.clientId as string,
      projectId: (data.projectId as string) || null,
      invoiceNumber: (data.invoiceNumber as string) || `INV-${new Date().getFullYear()}-${String(this._invoices.length + 1).padStart(3, "0")}`,
      status: "draft",
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      paymentProof: null,
      total,
      currency: (data.currency as string) || "USD",
      issueDate: (data.issueDate as Timestamp) || Timestamp.now(),
      dueDate: (data.dueDate as Timestamp) || Timestamp.fromMillis(Timestamp.now().toMillis() + 30 * 86400000),
      paidDate: null,
      notes: (data.notes as string) || null,
      pdfUrl: null,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    this._invoices.unshift(invoice);
    return id;
  }

  updateInvoice(id: string, data: Record<string, unknown>): void {
    const idx = this._invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return;

    const updated = { ...this._invoices[idx], ...data, updatedAt: Timestamp.now() } as Invoice;

    // Recompute totals if line items changed
    if (data.lineItems) {
      const lineItems = data.lineItems as InvoiceLineItem[];
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = (updated.taxRate ?? 0);
      updated.subtotal = subtotal;
      updated.taxAmount = subtotal * (taxRate / 100);

      const discount = updated.discount;
      let discountAmount = 0;
      if (discount && discount.amount > 0) {
        if (discount.type === "percentage") {
          discountAmount = subtotal * (discount.amount / 100);
        } else {
          discountAmount = Math.min(discount.amount, subtotal + updated.taxAmount);
        }
      }
      updated.total = subtotal + updated.taxAmount - discountAmount;
    }

    if (data.status === "paid" && !updated.paidDate) {
      updated.paidDate = Timestamp.now();
    }

    this._invoices[idx] = updated;
  }

  deleteInvoice(id: string): void {
    this._invoices = this._invoices.filter((inv) => inv.id !== id);
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

  // ── Contract Operations ──

  getContracts(): Contract[] {
    return [...this._contracts];
  }

  getContract(id: string): Contract | null {
    return this._contracts.find((c) => c.id === id) ?? null;
  }

  createContract(
    workspaceId: string,
    data: {
      contractTitle: string;
      type: "contract" | "proposal";
      content?: string;
      clientId?: string | null;
      projectId?: string | null;
      signers?: ContractSigner[];
    }
  ): string {
    const id = `demo-contract-${Date.now()}`;
    const contract: Contract = {
      id,
      workspaceId,
      contractTitle: data.contractTitle,
      type: data.type || "contract",
      status: "draft",
      content: data.content || "",
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      signers: data.signers || [],
      activities: [
        {
          type: "created",
          userId: DEMO_USER_ID,
          userName: "Demo User",
          timestamp: Timestamp.now(),
        },
      ],
      attachments: [],
      signatures: [],
      dateSent: null,
      dateSigned: null,
      createdBy: DEMO_USER_ID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    this._contracts.unshift(contract);
    return id;
  }

  updateContract(id: string, data: Partial<Contract>): void {
    const idx = this._contracts.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this._contracts[idx] = { ...this._contracts[idx], ...data, updatedAt: Timestamp.now() };
    }
  }

  deleteContract(id: string): void {
    this._contracts = this._contracts.filter((c) => c.id !== id);
  }

  signContract(contractId: string, signerId: string, signature: string): void {
    const contract = this._contracts.find((c) => c.id === contractId);
    if (!contract) return;

    const updatedSigners = contract.signers.map((s) =>
      s.id === signerId ? { ...s, status: "signed" as const, signedAt: Timestamp.now() } : s
    );

    const allSigned = updatedSigners.every((s) => s.status === "signed");

    contract.signers = updatedSigners;
    contract.signatures = [
      ...(contract.signatures || []),
      { signer: signerId, signature, signedAt: Timestamp.now() },
    ];
    contract.updatedAt = Timestamp.now();

    if (allSigned) {
      contract.status = "signed";
      contract.dateSigned = Timestamp.now();
    }
  }

  // ── Template Operations ──

  getTemplates(): ContractTemplate[] {
    return [...this._templates];
  }

  getTemplate(id: string): ContractTemplate | null {
    return this._templates.find((t) => t.id === id) ?? null;
  }

  createTemplate(
    workspaceId: string,
    data: {
      templateTitle: string;
      templateDescription?: string;
      type: "contract" | "proposal";
      content?: string;
    }
  ): string {
    const id = `demo-template-${Date.now()}`;
    const template: ContractTemplate = {
      id,
      workspaceId,
      templateTitle: data.templateTitle,
      templateDescription: data.templateDescription || "",
      type: data.type || "contract",
      content: data.content || "",
      status: "draft",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    this._templates.unshift(template);
    return id;
  }

  updateTemplate(id: string, data: Partial<ContractTemplate>): void {
    const idx = this._templates.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this._templates[idx] = { ...this._templates[idx], ...data, updatedAt: Timestamp.now() };
    }
  }

  deleteTemplate(id: string): void {
    this._templates = this._templates.filter((t) => t.id !== id);
  }
}

// Singleton - shared across all demo sessions
export const demoStore = new DemoStore();
