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
  | "documents"
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
  documents: "Documents",
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
  documents: true,
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
  documents: true,
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
  documents: false,
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
  updatedAt: Timestamp;
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

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partial";

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
    documents: boolean;
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
    documents: true,
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
      "Access shared documents and resources",
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
