import { Timestamp } from "firebase/firestore";

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "owner" | "admin" | "member" | "viewer" | "client";
  timezone: string;
  language: string;
  currency: string;
  notificationPrefs: {
    email: boolean;
    inApp: boolean;
    followUpReminders: boolean;
    digestFrequency: "daily" | "weekly" | "none";
  };
  workspaceIds: string[];
  activeWorkspaceId: string | null;
  workspaceRoles?: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
}

// ─── Workspace ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  dateFormat: string;
  weekStart: "sunday" | "monday";
  pipeline: {
    stages: PipelineStage[];
  };
  customFields: CustomField[];
  niches: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
  memberIds: string[];
  modulePermissions?: ModulePermissionsByRole;
  analyticsCards?: AnalyticsCardConfig[];
  googleCalendar?: WorkspaceGoogleCalendarConfig;
}

export interface WorkspaceGoogleCalendarConfig {
  connected: boolean;
  email: string | null;
  connectedCalendars: GoogleCalendarInfo[];
  selectedCalendarIds: string[];
  /** Calendar ID where new events/meetings are created. Defaults to "primary". */
  targetCalendarId?: string;
}

export interface GoogleCalendarInfo {
  id: string;
  name: string;
  primary: boolean;
}

// ─── Analytics Cards ────────────────────────────────────────────────────────

export type AnalyticsCardType =
  | "kpi"
  | "line_chart"
  | "pie_chart"
  | "bar_chart"
  | "funnel"
  | "top_leads"
  | "summary";

export interface AnalyticsCardConfig {
  id: string;
  type: AnalyticsCardType;
  title: string;
  /** Metric key — e.g. "total_leads", "leads_over_time", "pipeline_distribution" */
  metric: string;
  /** For custom field charts (select/multiselect types) */
  customFieldId?: string;
  order: number;
}

export type ModuleId =
  | "dashboard"
  | "leads"
  | "pipeline"
  | "analytics"
  | "time_tracker"
  | "messages"
  | "automations"
  | "meetings"
  | "settings"
  | "clients";

export type ModulePermissionsMap = Record<ModuleId, boolean>;

export interface ModulePermissionsByRole {
  member: ModulePermissionsMap;
  viewer: ModulePermissionsMap;
}

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  pipeline: "Pipeline",
  analytics: "Analytics",
  time_tracker: "Time Tracker",
  messages: "Messages",
  automations: "Automations",
  meetings: "Meetings",
  settings: "Settings",
  clients: "Clients",
} as const;

export const DEFAULT_MEMBER_PERMISSIONS: ModulePermissionsMap = {
  dashboard: true,
  leads: true,
  pipeline: true,
  analytics: true,
  time_tracker: true,
  messages: true,
  automations: false,
  meetings: true,
  settings: true,
  clients: true,
};

export const DEFAULT_VIEWER_PERMISSIONS: ModulePermissionsMap = {
  dashboard: true,
  leads: true,
  pipeline: false,
  analytics: true,
  time_tracker: false,
  messages: false,
  automations: false,
  meetings: false,
  settings: true,
  clients: true,
};

export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "owner" | "admin" | "member" | "viewer" | "client";
  joinedAt: Timestamp;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  invitedBy: string;
  role: "admin" | "member" | "viewer" | "client";
  status: "pending" | "accepted" | "expired";
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  probability: number;
  order: number;
  wipLimit?: number;
}

export interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "url" | "email";
  options?: string[];
  required: boolean;
  order: number;
}

// ─── Lead ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  source: string | null;
  niche: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  linkedin: string | null;
  value: number | null;
  currency: string;
  assignedTo: string | null;
  tags: string[];
  notes: string | null;
  customFields: Record<string, unknown>;
  socialProfiles: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  avatarUrl: string | null;
  attachments: Attachment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastContactedAt: Timestamp | null;
  nextFollowUpAt: Timestamp | null;
  expectedCloseAt: Timestamp | null;
  createdBy: string;
  sr?: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Timestamp;
}

// ─── Document (Cloudinary) ───────────────────────────────────────────────────

export interface Document {
  id: string;
  workspaceId: string;
  leadId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  cloudinaryResourceType: string;
  uploadedBy: string;
  createdAt: Timestamp;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  workspaceId: string;
  leadId: string;
  type:
    | "email"
    | "call"
    | "meeting"
    | "message"
    | "note"
    | "task"
    | "status_change"
    | "system";
  subtype?: string;
  subject: string | null;
  body: string | null;
  duration?: number;
  direction?: "inbound" | "outbound";
  createdBy: string;
  createdAt: Timestamp;
  metadata?: Record<string, unknown>;
}

// ─── Meeting ─────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  workspaceId: string;
  leadId?: string;
  conversationId?: string;
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  timezone: string;
  attendees: { email: string; name: string }[];
  conferencingTool: "google_meet";
  googleMeetLink: string;
  calendarEventId: string;
  calendarEventUrl?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  meetingType: "instant" | "scheduled";
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  body: string;
  deleted: boolean;
  edited: boolean;
  editedAt?: Timestamp;
  createdAt: Timestamp | null;
  /* Enrichments */
  replyTo?: string | null;
  replyPreview?: string | null;
  mentions?: string[];
  readBy?: string[];
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Timestamp;
  reactions?: Record<string, string[]>;
  attachment?: {
    type: "image" | "document" | "voice" | "video";
    url: string;
    name: string;
    size: number;
    mimeType: string;
    duration?: number;
  } | null;
  /* Meeting card embedded in message */
  meetingCard?: {
    meetLink: string;
    calendarEventUrl?: string;
    status: "active" | "ended";
  } | null;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  type?: "lead" | "member";
  /** Lead-specific — set when type is "lead" */
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  /** Member-specific — set when type is "member" */
  participantIds: string[];
  participantNames: string[];
  groupName?: string;
  /** Common */
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadCount: number;
  createdAt: Timestamp;
}

// ─── Task ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  workspaceId: string;
  leadId: string | null;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Timestamp | null;
  assignedTo: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}

// ─── Time Entry ──────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  workspaceId: string;
  leadId: string | null;
  taskId: string | null;
  userId: string;
  description: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  duration: number;
  billable: boolean;
  hourlyRate: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Automation ──────────────────────────────────────────────────────────────

export interface Automation {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: {
    type:
      | "lead_created"
      | "status_changed"
      | "no_contact_days"
      | "scheduled_date"
      | "field_changed"
      | "tag_added"
      | "tag_removed";
    config: Record<string, unknown>;
  };
  actions: {
    type:
      | "send_notification"
      | "create_task"
      | "change_status"
      | "add_tag"
      | "remove_tag"
      | "assign"
      | "send_email"
      | "log_activity";
    config: Record<string, unknown>;
  }[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type:
    | "follow_up_due"
    | "lead_assigned"
    | "task_due"
    | "automation_triggered"
    | "mention"
    | "system";
  title: string;
  message: string;
  leadId: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: Timestamp;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "status_changed"
  | "email_sent"
  | "document_uploaded"
  | "document_deleted"
  | "task_created"
  | "task_completed"
  | "user_login"
  | "user_logout"
  | "settings_changed"
  | "note_added"
  | "call_logged"
  | "meeting_logged"
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "pipeline_changed"
  | "custom_field_changed"
  | "workspace_created"
  | "workspace_deleted";

export interface AuditLog {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: "lead" | "document" | "task" | "user" | "workspace" | "settings" | "member" | "pipeline" | "custom_field";
  entityId: string;
  entityName: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface AuditFilters {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  action?: AuditAction;
  leadSearch?: string;
}
