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
  /** Metric key - e.g. "total_leads", "leads_over_time", "pipeline_distribution" */
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
  | "contracts"
  | "invoices"
  | "settings"
  | "clients"
  | "projects";

export type ModulePermissionsMap = Record<ModuleId, boolean>;

export interface ModulePermissionsByRole {
  member: ModulePermissionsMap;
  viewer: ModulePermissionsMap;
  client?: ModulePermissionsMap;
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
  invoices: "Invoices",
  contracts: "Contracts",
  settings: "Settings",
  clients: "Clients",
  projects: "Projects",
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
  invoices: true,
  contracts: true,
  settings: true,
  clients: false,
  projects: true,
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
  invoices: true,
  contracts: true,
  settings: true,
  clients: true,
  projects: true,
};

export const DEFAULT_CLIENT_PERMISSIONS: ModulePermissionsMap = {
  dashboard: false,
  leads: false,
  pipeline: false,
  analytics: false,
  time_tracker: false,
  messages: false,
  automations: false,
  meetings: false,
  invoices: false,
  contracts: false,
  settings: false,
  clients: false,
  projects: false,
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
  projectId?: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  cloudinaryResourceType: string;
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  /** File category for organization */
  category?: string;
  /** Tags for search/filter */
  tags?: string[];
  /** Client IDs this document is shared with */
  sharedWith?: string[];
}

// ─── Contract & eSignatures ──────────────────────────────────────────────────

export type ContractStatus = "draft" | "sent" | "signed" | "rejected" | "cancelled" | "terminated";
export type ContractType = "contract" | "proposal";
export type SignerStatus = "pending" | "sent" | "viewed" | "signed" | "rejected";
export type SignerType = "owner" | "signer";

export interface ContractSignerField {
  signature?: string;
  date?: string;
  initials?: string;
  checkbox?: string;
}

export interface ContractSigner {
  id: string;
  email: string;
  name: string;
  title: string;
  type: SignerType;
  status: SignerStatus;
  required: boolean;
  selectedFields?: ContractSignerField;
  signedAt?: Timestamp;
}

export interface ContractActivity {
  id?: string;
  type: "created" | "sent" | "viewed" | "signed" | "rejected" | "cancelled" | "terminated";
  userId: string;
  userName: string;
  timestamp: Timestamp;
  details?: string;
}

export interface ContractAttachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface Contract {
  id: string;
  workspaceId: string;
  contractTitle: string;
  type: ContractType;
  status: ContractStatus;
  content: string;
  clientId: string | null;
  projectId: string | null;
  signers: ContractSigner[];
  activities: ContractActivity[];
  attachments: ContractAttachment[];
  signatures: Array<{
    signer: string;
    signature: string;
    signedAt: Timestamp;
  }>;
  dateSent: Timestamp | null;
  dateSigned: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContractTemplate {
  id: string;
  workspaceId: string;
  templateTitle: string;
  templateDescription: string;
  type: ContractType;
  content: string;
  status: ContractStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  clientId?: string;
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
  /** Lead-specific - set when type is "lead" */
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  /** Member-specific - set when type is "member" */
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

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "completed" | "on_hold" | "cancelled";

export interface ProjectClient {
  clientId: string;
  isMainContact: boolean;
  addedAt: Timestamp;
  addedBy: string;
  clientNotes: string;
}

export interface LinkEmbed {
  id: string;
  type: "link" | "embed";
  title: string;
  url?: string;
  embedCode?: string;
  addedBy: string;
  addedAt: Timestamp | { seconds: number; nanoseconds: number };
}

export interface ProjectDeliveryFlow {
  enableFeedback: boolean;
  enableReferrals: boolean;
  enableReviews: boolean;
  enableUpsell: boolean;
  referralMessage: string;
  reviewPlatforms: Array<{
    name: string;
    url: string;
    enabled: boolean;
  }>;
  reviewMessage: string;
  onlyAsk5Star: boolean;
  upsellMessage: string;
  upsellServices: string[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  /** User IDs of assigned clients (legacy) */
  clients: string[];
  /** Enhanced multi-client support */
  projectClients: ProjectClient[];
  /** Workspace member IDs assigned to this project */
  memberIds: string[];
  /** Service IDs associated with this project */
  serviceIds: string[];
  /** Lead ID this project is associated with (optional) */
  leadId: string | null;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  completedDate: Timestamp | null;
  /** Progress percentage 0-100 */
  progress: number;
  /** Manual progress override */
  manualProgress: number | null;
  /** Whether progress is manually set vs auto-calculated */
  isManualProgress: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  /** Budget / contract value */
  budget: number | null;
  currency: string;
  /** Custom field values */
  customFields: Record<string, unknown>;
  /** Links and embeds attached to this project */
  linksAndEmbeds: LinkEmbed[];
  /** Delivery flow settings */
  deliveryFlowSettings: ProjectDeliveryFlow;
  /** Final package delivery tracking */
  hasFinalPackage: boolean;
  finalPackageDelivered: boolean;
  finalPackageDeliveredAt: Timestamp | null;
  showFinalPackageBanner: boolean;
  /** Project visibility */
  visibility: "Public" | "Private";
  /** Archival state */
  isArchive: boolean;
  archivedAt: Timestamp | null;
  archivedReason: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Project Task ────────────────────────────────────────────────────────────

export interface ProjectTaskStatus {
  parent: "To Do" | "In Progress" | "Complete" | "On Hold";
  name: string;
  color: string;
}

export interface ProjectRecurringDetails {
  type: "Custom" | "Periodically" | "Daily" | "Weekly" | "Monthly" | "Yearly";
  every: number;
  everyValue: "Days" | "Weeks" | "Months" | "Years";
  dayAfterCompletion: number;
  everySelect: string;
  everyValues: string;
  isOnThe: boolean;
  isOnDay: boolean;
}

export interface TaskFile {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  workspaceId: string;
  taskName: string;
  description: string | null;
  assigneeId: string | null;
  parentTaskId: string | null;
  milestoneId: string | null;
  isSubtask: boolean;
  hasSubtasks: boolean;
  status: ProjectTaskStatus;
  priority: "low" | "medium" | "high" | "urgent" | null;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  startDateDays: number | null;
  dueDateDays: number | null;
  startDateReference: string | null;
  dueDateReference: string | null;
  recurring: boolean;
  recurringDetails: ProjectRecurringDetails | null;
  weekDays: string[];
  visibility: "Public" | "Private";
  order: number;
  isMilestone: boolean;
  completedAt: Timestamp | null;
  customFields: Record<string, unknown>;
  files: TaskFile[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: boolean;
}

// ─── Project Milestone ────────────────────────────────────────────────────────

export interface ProjectMilestone {
  id: string;
  projectId: string;
  workspaceId: string;
  milestoneName: string;
  description: string | null;
  dueDate: Timestamp | null;
  status: "Pending" | "Completed" | "Failed";
  order: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: boolean;
}

// ─── Project Note ─────────────────────────────────────────────────────────────

export interface ProjectNote {
  id: string;
  projectId: string;
  workspaceId: string;
  taskId: string | null;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: boolean;
}

// ─── Project Time Entry ──────────────────────────────────────────────────────

export interface ProjectTimeEntry {
  id: string;
  projectId: string;
  workspaceId: string;
  taskId: string;
  memberId: string;
  date: Timestamp;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  totalTime: number;
  isPaused: boolean;
  billable: boolean;
  billed: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: boolean;
}

// ─── Project Deliverables ────────────────────────────────────────────────────

export type DeliverableStatus = "not_submitted" | "submitted" | "under_review" | "needs_revision" | "approved" | "delivered";

export type MarkupType = "annotation" | "highlight" | "arrow" | "voice_memo" | "shape" | "pen";

export type DeliverableItemType = "document" | "design" | "code" | "media" | "other";

/** File category for organizing files in the version preview */
export type FileCategory = "image" | "video" | "document" | "audio" | "download";

export const FILE_CATEGORY_MAP: Record<string, FileCategory> = {
  "image/jpeg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/svg+xml": "image", "image/bmp": "image",
  "image/tiff": "image", "image/avif": "image",
  "video/mp4": "video", "video/webm": "video", "video/ogg": "video",
  "video/quicktime": "video", "video/x-msvideo": "video",
  "video/x-matroska": "video", "video/mpeg": "video",
  "video/3gpp": "video", "video/x-ms-wmv": "video",
  "application/pdf": "document", "text/plain": "document",
  "text/html": "document", "text/csv": "document",
  "text/markdown": "document", "application/rtf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  "audio/mpeg": "audio", "audio/wav": "audio", "audio/ogg": "audio",
  "audio/aac": "audio", "audio/flac": "audio", "audio/webm": "audio",
  "audio/mp4": "audio", "audio/x-m4a": "audio",
};

export function getFileCategory(mimeType: string): FileCategory {
  const normalized = mimeType.toLowerCase().trim();
  // Fix SVG mime type
  const fixed = normalized === "image/svg" ? "image/svg+xml" : normalized;
  return FILE_CATEGORY_MAP[fixed] || "download";
}

export interface VideoMoment {
  id: string;
  timestamp: number;
  title?: string;
  comment: string;
  createdBy: string;
  createdAt: Timestamp;
  isResolved: boolean;
  conversation: ThreadedComment[];
}

export interface ImageMarkupCoordinate {
  x: number;
  y: number;
  page?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
}

export interface ImageMarkup {
  id: string;
  markupType: MarkupType;
  coordinates: ImageMarkupCoordinate;
  content: {
    text?: string;
    voiceMemoUrl?: string;
    color?: string;
    strokeWidth?: number;
    fontSize?: number;
    path?: string;
  };
  createdBy: string;
  createdAt: Timestamp;
  conversation: ThreadedComment[];
}

export interface DeliverableFileAttachment {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  cloudinaryUrl?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  thumbnail?: string;
  downloadCount: number;
  videoMoments: VideoMoment[];
  imageMarkups: ImageMarkup[];
}

export interface ThreadedComment {
  id: string;
  text: string;
  voiceMemoUrl?: string;
  createdBy: string;
  createdAt: Timestamp;
  attachments: DeliverableFileAttachment[];
  versionId?: string;
  fileId?: string;
  linkId?: string;
  associationType?: "file" | "link" | "general";
  associatedItemId?: string;
  associatedItemType?: string;
  associatedItemName?: string;
  mentions: string[];
  replies: ThreadedComment[];
  reactions?: { userId: string; type: string; createdAt: Timestamp }[];
  isDeleted?: boolean;
}

export interface LinkData {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: Timestamp;
  metadata?: {
    favicon?: string;
    siteName?: string;
    image?: string;
  };
}

export interface DeliverableVersion {
  id: string;
  versionNumber: number;
  files: DeliverableFileAttachment[];
  links: LinkData[];
  notes?: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  status: "draft" | "submitted" | "approved" | "revision_requested";
  isLatest: boolean;
  is_read: boolean;
  commentCount: number;
  approvedAt?: Timestamp;
  approvedBy?: string;
  approvalComments?: string;
}

export interface PaymentProof {
  status: "pending" | "approved" | "rejected";
  uploadedBy: string;
  uploadedAt: Timestamp;
  fileName: string;
  filePath: string;
  fileSize: number;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
}

export interface ApprovalWorkflowEntry {
  approverType: "client" | "team_member" | "agency";
  approverId: string;
  approvedAt: Timestamp;
  comments: string;
  status: "pending" | "approved" | "rejected";
}

export interface RevisionSettings {
  limitFreeRevisions: boolean;
  maxFreeRevisions: number;
  currentRevisionCount: number;
  addExtraRevisionUpsell: boolean;
  extraRevisionPrice: number;
  limitRevisionPeriod: boolean;
  revisionTimeLimit: number;
  revisionTimeLimitUnit: "days" | "weeks" | "months";
}

export interface ClientFeedback {
  rating?: number;
  recommendation?: number;
  feedback?: string;
  testimonialPermission?: boolean;
  submittedBy?: string;
  submittedAt?: Timestamp;
}

export interface ReferralTracking {
  type: "click" | "contact";
  platform?: string;
  clickedBy?: string;
  clickedAt?: Timestamp;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status: "pending" | "contacted" | "converted";
}

export interface ReviewTracking {
  platform: string;
  reviewLink: string;
  submittedBy?: string;
  submittedAt?: Timestamp;
}

export interface DeliveryProgress {
  completedSteps: string[];
  currentStep: string;
  lastUpdated?: Timestamp;
}

export interface InvoiceSettings {
  requirePaymentToView: boolean;
  requirePaymentToDownload: boolean;
  viewInvoiceId?: string;
  downloadInvoiceId?: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: DeliverableStatus;
  versions: DeliverableVersion[];
  comments: ThreadedComment[];
  deliverableType: DeliverableItemType;
  invoiceSettings: InvoiceSettings;
  paymentProof?: PaymentProof;
  revisionSettings: RevisionSettings;
  revisions: DeliverableRevision[];
  clientVisible: boolean;
  dueDate: Timestamp | null;
  paidCredits: number;
  approvalWorkflow: ApprovalWorkflowEntry[];
  deliveryFlowSettings: {
    enableFeedback: boolean;
    enableReferrals: boolean;
    enableReviews: boolean;
    enableUpsell: boolean;
  };
  deliveryProgress: DeliveryProgress;
  isFinalPackage: boolean;
  finalPackageDelivered: boolean;
  finalPackageDeliveredAt?: Timestamp;
  finalPackageDeliveredBy?: string;
  finalPackageDeliveryStatus: "not_delivered" | "delivered" | "viewed" | "completed";
  finalPackageViewed: boolean;
  finalPackageViewedAt?: Timestamp;
  clientFeedback: ClientFeedback[];
  referralTracking: ReferralTracking[];
  reviewTracking: ReviewTracking[];
  isDeleted: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeliverableRevisionComment {
  id: string;
  text: string;
  createdBy: string;
  createdAt: Timestamp;
  fileId?: string;
  linkId?: string;
  associationType?: "file" | "link" | "general";
  associatedItemId?: string;
  associatedItemType?: string;
  associatedItemName?: string;
  attachments: DeliverableFileAttachment[];
  mentions: string[];
  replies: ThreadedComment[];
}

export interface DeliverableRevision {
  id: string;
  versionId: string;
  versionNumber: number;
  requestedBy: string;
  requestDate: Timestamp;
  reason?: string;
  comments: DeliverableRevisionComment[];
  attachments: DeliverableFileAttachment[];
  isExtraRevision: boolean;
  price?: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  is_read: boolean;
  completedAt?: Timestamp;
  notes?: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partial" | "pending_review";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Service pricing type: fixed, custom, hourly, subscription, free */
  serviceType?: "fixed" | "custom" | "hourly" | "subscription" | "free";
}

export interface InvoiceDiscount {
  type: "percentage" | "fixed";
  amount: number;
  description?: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  /** Client user ID */
  clientId: string;
  /** Project ID this invoice belongs to (optional) */
  projectId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Timestamp;
  dueDate: Timestamp;
  paidDate: Timestamp | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  /** Overall discount applied */
  discount: InvoiceDiscount | null;
  total: number;
  currency: string;
  /** Notes visible to client */
  notes: string | null;
  /** URL to PDF version */
  pdfUrl: string | null;
  /** Payment proof uploaded by client for manual payment verification */
  paymentProof: PaymentProof | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Client Portal Settings ──────────────────────────────────────────────────

export interface ClientPortalSettings {
  /** Master toggle - when disabled, clients see a maintenance page */
  enabled: boolean;
  /** Module visibility toggles - which modules clients can see */
  modules: {
    projects: boolean;
    messages: boolean;
    meetings: boolean;
    invoices: boolean;
    contracts: boolean;
    time_tracking: boolean;
    project_requests: boolean;
  };
  /** Welcome card configuration */
  welcomeCard: {
    title: string;
    description: string;
    bulletPoints: string[];
    mediaUrl: string | null;
    mediaType: "image" | "video" | null;
    showOnFirstVisitOnly: boolean;
    enabled: boolean;
  };
  /** Onboarding checklist configuration */
  checklist: {
    enabled: boolean;
    steps: ClientChecklistStep[];
  };
  /** Curated links displayed on dashboard */
  helpfulLinks: ClientHelpfulLink[];
  /** Curated files displayed on dashboard */
  helpfulFiles: ClientHelpfulFile[];
  /** Metadata */
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ClientChecklistStep {
  id: string;
  title: string;
  description: string;
  videoUrl: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  order: number;
}

export interface ClientHelpfulLink {
  id: string;
  title: string;
  url: string;
  order: number;
}

export interface ClientHelpfulFile {
  id: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/** Per-user progress tracking for client onboarding checklist */
export interface ClientChecklistProgress {
  /** Composite key: {workspaceId}_{userId} */
  id: string;
  workspaceId: string;
  userId: string;
  completedStepIds: string[];
  dismissedWelcomeCard: boolean;
  updatedAt: Timestamp;
}

/** Default portal settings when none exist yet */
export const DEFAULT_CLIENT_PORTAL_SETTINGS: Partial<ClientPortalSettings> & { enabled: boolean } = {
  enabled: true,
  modules: {
    projects: true,
    messages: true,
    meetings: true,
    invoices: true,
    contracts: true,
    time_tracking: false,
    project_requests: true,
  },
  welcomeCard: {
    title: "Welcome to the Client Portal",
    description:
      "We're excited to have you onboard. Here you can track your projects, communicate with our team, and manage everything in one place.",
    bulletPoints: [
      "View real-time project progress and updates",
      "Send and receive messages with your project team",
      "Access contracts and project resources",
    ],
    mediaUrl: null,
    mediaType: null,
    showOnFirstVisitOnly: true,
    enabled: true,
  },
  checklist: {
    enabled: true,
    steps: [],
  },
  helpfulLinks: [],
  helpfulFiles: [],
};
