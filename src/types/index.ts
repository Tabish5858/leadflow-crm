import { Timestamp } from "firebase/firestore";

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "owner" | "admin" | "member" | "viewer";
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
  inviteCode: string | null;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: Timestamp;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  invitedBy: string;
  role: "admin" | "member" | "viewer";
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
  type: "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "url";
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
  createdBy: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Timestamp;
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
