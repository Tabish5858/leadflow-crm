/** Default pipeline stages for new workspaces */
export const DEFAULT_PIPELINE_STAGES = [
  { id: "new", name: "New", color: "#3b82f6", probability: 0, order: 0 },
  { id: "contacted", name: "Contacted", color: "#eab308", probability: 10, order: 1 },
  { id: "qualified", name: "Qualified", color: "#f97316", probability: 25, order: 2 },
  { id: "proposal", name: "Proposal", color: "#a855f7", probability: 50, order: 3 },
  { id: "negotiation", name: "Negotiation", color: "#ef4444", probability: 75, order: 4 },
  { id: "won", name: "Won", color: "#22c55e", probability: 100, order: 5 },
  { id: "lost", name: "Lost", color: "#6b7280", probability: 0, order: 6 },
];

/** Lead source options */
export const LEAD_SOURCES = [
  "website",
  "referral",
  "cold_outreach",
  "social_media",
  "linkedin",
  "google_ads",
  "facebook_ads",
  "event",
  "content",
  "partner",
  "other",
];

/** Predefined industry niches */
export const NICHES = [
  "Technology",
  "SaaS",
  "E-commerce",
  "Real Estate",
  "Finance",
  "Healthcare",
  "Education",
  "Marketing & Advertising",
  "Consulting",
  "Legal",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Construction",
  "Automotive",
  "Media & Entertainment",
  "Non-Profit",
  "Government",
  "Agriculture",
  "Energy",
  "Telecommunications",
  "Insurance",
  "Logistics",
  "Human Resources",
  "Other",
];

/** Activity types */
export const ACTIVITY_TYPES = [
  "email",
  "call",
  "meeting",
  "message",
  "note",
  "task",
  "status_change",
  "system",
] as const;

/** Task priorities */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/** Task statuses */
export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
