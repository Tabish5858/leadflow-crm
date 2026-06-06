import { db } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import type {
  Deliverable,
  DeliverableVersion,
  DeliverableFileAttachment,
  DeliverableRevision,
  ThreadedComment,
  VideoMoment,
  ImageMarkup,
  PaymentProof,
} from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLLECTION = "project_deliverables";

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createDeliverable(
  workspaceId: string,
  projectId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    deliverableType?: "document" | "design" | "code" | "media" | "other";
    invoiceSettings?: {
      requirePaymentToView?: boolean;
      requirePaymentToDownload?: boolean;
    };
    revisionSettings?: {
      limitFreeRevisions?: boolean;
      maxFreeRevisions?: number;
      addExtraRevisionUpsell?: boolean;
      extraRevisionPrice?: number;
      limitRevisionPeriod?: boolean;
      revisionTimeLimit?: number;
      revisionTimeLimitUnit?: "days" | "weeks" | "months";
    };
    clientVisible?: boolean;
    dueDate?: Timestamp | null;
  }
): Promise<string> {
  const now = serverTimestamp();
  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    workspaceId,
    title: data.title,
    description: data.description || "",
    status: "not_submitted",
    versions: [],
    comments: [],
    deliverableType: data.deliverableType || "document",
    invoiceSettings: {
      requirePaymentToView: data.invoiceSettings?.requirePaymentToView ?? false,
      requirePaymentToDownload: data.invoiceSettings?.requirePaymentToDownload ?? false,
    },
    revisionSettings: {
      limitFreeRevisions: data.revisionSettings?.limitFreeRevisions ?? false,
      maxFreeRevisions: data.revisionSettings?.maxFreeRevisions ?? 0,
      currentRevisionCount: 0,
      addExtraRevisionUpsell: data.revisionSettings?.addExtraRevisionUpsell ?? false,
      extraRevisionPrice: data.revisionSettings?.extraRevisionPrice ?? 0,
      limitRevisionPeriod: data.revisionSettings?.limitRevisionPeriod ?? false,
      revisionTimeLimit: data.revisionSettings?.revisionTimeLimit ?? 7,
      revisionTimeLimitUnit: data.revisionSettings?.revisionTimeLimitUnit ?? "days",
    },
    revisions: [],
    paidCredits: 0,
    clientVisible: data.clientVisible ?? true,
    dueDate: data.dueDate ?? null,
    approvalWorkflow: [],
    deliveryFlowSettings: {
      enableFeedback: true,
      enableReferrals: true,
      enableReviews: true,
      enableUpsell: true,
    },
    deliveryProgress: {
      completedSteps: [],
      currentStep: "package",
    },
    isFinalPackage: false,
    finalPackageDelivered: false,
    finalPackageDeliveryStatus: "not_delivered",
    finalPackageViewed: false,
    clientFeedback: [],
    referralTracking: [],
    reviewTracking: [],
    isDeleted: false,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function getDeliverable(id: string): Promise<Deliverable | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as Deliverable;
}

export async function getProjectDeliverables(projectId: string): Promise<Deliverable[]> {
  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId),
    where("isDeleted", "==", false),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as Deliverable);
}

export async function updateDeliverable(
  id: string,
  data: Partial<Deliverable>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDeliverable(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively removes all `undefined` values from an object. Firestore rejects undefined.
 *  Preserves Date/Timestamp objects (does not JSON.stringify them). */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  // Preserve Timestamp and Date objects
  if (obj instanceof Date) return obj;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((obj as any)?.toDate !== undefined || (obj as any)?.seconds !== undefined) return obj;
  // Don't modify Timestamp instances from Firestore
  if (obj.constructor?.name === "Timestamp") return obj;

  if (Array.isArray(obj)) return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

// ─── Version Management ──────────────────────────────────────────────────────

export async function addDeliverableVersion(
  deliverableId: string,
  userId: string,
  version: Omit<DeliverableVersion, "id" | "versionNumber" | "uploadedAt" | "uploadedBy" | "status" | "isLatest" | "is_read">
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const versionNumber = del.versions.length + 1;
  const now = Timestamp.now();

  // Sanitize old versions (Firestore rejects undefined) then mark as not latest
  const updatedVersions = del.versions.map((v) => sanitizeForFirestore({ ...v, isLatest: false }));

  const newVersion: DeliverableVersion = {
    id: `v-${versionNumber}-${Date.now()}`,
    versionNumber,
    files: (version.files || []).map((f) => sanitizeForFirestore(f)),
    links: (version.links || []).map((l) => sanitizeForFirestore(l)),
    notes: version.notes,
    uploadedAt: now,
    uploadedBy: userId,
    status: "submitted",
    isLatest: true,
    is_read: false,
    commentCount: 0,
  };

  updatedVersions.push(sanitizeForFirestore(newVersion));

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    status: "submitted",
    updatedAt: serverTimestamp(),
  });
}

export async function approveVersion(
  deliverableId: string,
  versionId: string,
  userId: string,
  comments?: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) =>
    v.id === versionId
      ? sanitizeForFirestore({
          ...v,
          status: "approved" as const,
          approvedAt: Timestamp.now(),
          approvedBy: userId,
          approvalComments: comments || null,
        })
      : sanitizeForFirestore(v)
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    status: "approved",
    approvalWorkflow: arrayUnion({
      approverType: "client",
      approverId: userId,
      approvedAt: Timestamp.now(),
      comments: comments || "",
      status: "approved",
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function resetApproval(
  deliverableId: string,
  versionId: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return sanitizeForFirestore(v);
    const { approvedAt, approvedBy, approvalComments, ...rest } = v;
    return sanitizeForFirestore({ ...rest, status: "submitted" as const });
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    status: "submitted",
    updatedAt: serverTimestamp(),
  });
}

export async function markVersionAsRead(
  deliverableId: string,
  versionId: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) =>
    v.id === versionId
      ? sanitizeForFirestore({ ...v, is_read: true })
      : sanitizeForFirestore(v)
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

// ─── Client Feedback (Explicit Submit) ──────────────────────────────────────

export async function submitClientFeedback(
  deliverableId: string,
  versionId: string,
  userId: string,
  comments?: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) =>
    v.id === versionId
      ? sanitizeForFirestore({ ...v, status: "revision_requested" as const })
      : sanitizeForFirestore(v)
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    status: "needs_revision",
    updatedAt: serverTimestamp(),
  });
}

// ─── Revision Management ────────────────────────────────────────────────────

export async function requestRevision(
  deliverableId: string,
  versionId: string,
  userId: string,
  reason: string,
  comments?: {
    text: string;
    fileId?: string;
    linkId?: string;
    associationType?: "file" | "link" | "general";
    associatedItemId?: string;
    associatedItemType?: string;
    associatedItemName?: string;
    attachments?: DeliverableFileAttachment[];
  }[]
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();

  const revision: DeliverableRevision = {
    id: `rev-${Date.now()}`,
    versionId,
    versionNumber: del.versions.find((v) => v.id === versionId)?.versionNumber || 1,
    requestedBy: userId,
    requestDate: now,
    reason,
    isExtraRevision: false,
    status: "pending",
    is_read: false,
    comments: (comments || []).map((c) => ({
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: c.text,
      createdBy: userId,
      createdAt: now,
      fileId: c.fileId,
      linkId: c.linkId,
      associationType: c.associationType || "general",
      associatedItemId: c.associatedItemId,
      associatedItemType: c.associatedItemType,
      associatedItemName: c.associatedItemName,
      attachments: c.attachments || [],
      mentions: [],
      replies: [],
    })),
    attachments: (comments || []).flatMap((c) => c.attachments || []),
  };

  const updatedVersions = del.versions.map((v) =>
    v.id === versionId ? { ...v, status: "revision_requested" as const } : v
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    status: "needs_revision",
    revisions: arrayUnion(revision),
    "revisionSettings.currentRevisionCount": increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function markRevisionAsRead(
  deliverableId: string,
  revisionId: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedRevisions = del.revisions.map((r) =>
    r.id === revisionId ? { ...r, is_read: true } : r
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    revisions: updatedRevisions,
    updatedAt: serverTimestamp(),
  });
}

// ─── Payment Proof ───────────────────────────────────────────────────────────

export async function submitPaymentProof(
  deliverableId: string,
  userId: string,
  proof: { fileName: string; filePath: string; fileSize: number }
): Promise<void> {
  const now = Timestamp.now();
  const paymentProof: PaymentProof = {
    status: "pending",
    uploadedBy: userId,
    uploadedAt: now,
    fileName: proof.fileName,
    filePath: proof.filePath,
    fileSize: proof.fileSize,
  };

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    paymentProof,
    updatedAt: serverTimestamp(),
  });
}

export async function approvePaymentProof(
  deliverableId: string,
  userId: string,
  notes?: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del?.paymentProof) throw new Error("No payment proof found");

  const updatedProof: PaymentProof = {
    ...del.paymentProof,
    status: "approved",
    reviewedBy: userId,
    reviewedAt: Timestamp.now(),
    reviewNotes: notes,
  };

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    paymentProof: updatedProof,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectPaymentProof(
  deliverableId: string,
  userId: string,
  notes: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del?.paymentProof) throw new Error("No payment proof found");

  const updatedProof: PaymentProof = {
    ...del.paymentProof,
    status: "rejected",
    reviewedBy: userId,
    reviewedAt: Timestamp.now(),
    reviewNotes: notes,
  };

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    paymentProof: updatedProof,
    updatedAt: serverTimestamp(),
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function addComment(
  deliverableId: string,
  userId: string,
  comment: {
    text: string;
    versionId?: string;
    fileId?: string;
    mentions?: string[];
    attachments?: DeliverableFileAttachment[];
  }
): Promise<void> {
  const now = Timestamp.now();
  const newComment: ThreadedComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: comment.text,
    createdBy: userId,
    createdAt: now,
    attachments: comment.attachments || [],
    versionId: comment.versionId,
    fileId: comment.fileId,
    mentions: comment.mentions || [],
    replies: [],
  };

  // Update comment count on version if versionId specified
  const updates: Record<string, unknown> = {
    comments: arrayUnion(newComment),
    updatedAt: serverTimestamp(),
  };

  if (comment.versionId) {
    const del = await getDeliverable(deliverableId);
    if (del) {
      const updatedVersions = del.versions.map((v) =>
        v.id === comment.versionId
          ? { ...v, commentCount: (v.commentCount || 0) + 1 }
          : v
      );
      updates.versions = updatedVersions;
    }
  }

  await updateDoc(doc(db, COLLECTION, deliverableId), updates);
}

export async function addReply(
  deliverableId: string,
  commentId: string,
  userId: string,
  reply: { text: string; attachments?: DeliverableFileAttachment[] }
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();
  const newReply: ThreadedComment = {
    id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: reply.text,
    createdBy: userId,
    createdAt: now,
    attachments: reply.attachments || [],
    mentions: [],
    replies: [],
  };

  const updatedComments = del.comments.map((c) =>
    c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c
  );

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    comments: updatedComments,
    updatedAt: serverTimestamp(),
  });
}

// ─── Video Moments ───────────────────────────────────────────────────────────

export async function addVideoMoment(
  deliverableId: string,
  versionId: string,
  fileId: string,
  userId: string,
  moment: { timestamp: number; comment: string; title?: string }
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();
  const newMoment: VideoMoment = {
    id: `vm-${Date.now()}`,
    timestamp: moment.timestamp,
    title: moment.title,
    comment: moment.comment,
    createdBy: userId,
    createdAt: now,
    isResolved: false,
    conversation: [],
  };

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id === fileId ? { ...f, videoMoments: [...(f.videoMoments || []), newMoment] } : f
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function updateVideoMoment(
  deliverableId: string,
  versionId: string,
  fileId: string,
  momentId: string,
  updates: Partial<{ title: string; comment: string; isResolved: boolean }>
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          videoMoments: (f.videoMoments || []).map((m) =>
            m.id === momentId ? { ...m, ...updates } : m
          ),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVideoMoment(
  deliverableId: string,
  versionId: string,
  fileId: string,
  momentId: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          videoMoments: (f.videoMoments || []).filter((m) => m.id !== momentId),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleVideoMomentResolution(
  deliverableId: string,
  versionId: string,
  fileId: string,
  momentId: string,
  isResolved: boolean
): Promise<void> {
  await updateVideoMoment(deliverableId, versionId, fileId, momentId, { isResolved });
}

export async function addVideoMomentReply(
  deliverableId: string,
  versionId: string,
  fileId: string,
  momentId: string,
  userId: string,
  reply: { text?: string; voiceMemoUrl?: string }
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();
  const newReply: ThreadedComment = {
    id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: reply.text || "",
    voiceMemoUrl: reply.voiceMemoUrl,
    createdBy: userId,
    createdAt: now,
    attachments: [],
    mentions: [],
    replies: [],
  };

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          videoMoments: (f.videoMoments || []).map((m) =>
            m.id === momentId
              ? { ...m, conversation: [...(m.conversation || []), newReply] }
              : m
          ),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

// ─── Image Markups ───────────────────────────────────────────────────────────

export async function addImageMarkup(
  deliverableId: string,
  versionId: string,
  fileId: string,
  userId: string,
  markup: Omit<ImageMarkup, "id" | "createdAt" | "createdBy" | "conversation">
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();
  const newMarkup: ImageMarkup = {
    id: `im-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...markup,
    createdBy: userId,
    createdAt: now,
    conversation: [],
  };

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id === fileId ? { ...f, imageMarkups: [...(f.imageMarkups || []), newMarkup] } : f
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function updateImageMarkup(
  deliverableId: string,
  versionId: string,
  fileId: string,
  markupId: string,
  updates: Partial<ImageMarkup>
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          imageMarkups: (f.imageMarkups || []).map((m) =>
            m.id === markupId ? { ...m, ...updates } : m
          ),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteImageMarkup(
  deliverableId: string,
  versionId: string,
  fileId: string,
  markupId: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          imageMarkups: (f.imageMarkups || []).filter((m) => m.id !== markupId),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

export async function addImageMarkupReply(
  deliverableId: string,
  versionId: string,
  fileId: string,
  markupId: string,
  userId: string,
  reply: { text?: string; voiceMemoUrl?: string }
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const now = Timestamp.now();
  const newReply: ThreadedComment = {
    id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: reply.text || "",
    voiceMemoUrl: reply.voiceMemoUrl,
    createdBy: userId,
    createdAt: now,
    attachments: [],
    mentions: [],
    replies: [],
  };

  const updatedVersions = del.versions.map((v) => {
    if (v.id !== versionId) return v;
    return {
      ...v,
      files: v.files.map((f) =>
        f.id !== fileId ? f : {
          ...f,
          imageMarkups: (f.imageMarkups || []).map((m) =>
            m.id === markupId
              ? { ...m, conversation: [...(m.conversation || []), newReply] }
              : m
          ),
        }
      ),
    };
  });

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    versions: sanitizeForFirestore(updatedVersions),
    updatedAt: serverTimestamp(),
  });
}

// ─── Feedback / Rating / Referral / Review Tracking ─────────────────────────

export async function submitClientRating(
  deliverableId: string,
  userId: string,
  feedback: {
    rating?: number;
    recommendation?: number;
    feedback?: string;
    testimonialPermission?: boolean;
  }
): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(db, COLLECTION, deliverableId), {
    clientFeedback: arrayUnion({
      ...feedback,
      submittedBy: userId,
      submittedAt: now,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function submitReferral(
  deliverableId: string,
  data: {
    type: "click" | "contact";
    platform?: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(db, COLLECTION, deliverableId), {
    referralTracking: arrayUnion({
      ...data,
      clickedAt: now,
      status: "pending",
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function submitReview(
  deliverableId: string,
  data: {
    platform: string;
    reviewLink: string;
  }
): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(db, COLLECTION, deliverableId), {
    reviewTracking: arrayUnion({
      ...data,
      submittedAt: now,
    }),
    updatedAt: serverTimestamp(),
  });
}

// ─── Final Package ───────────────────────────────────────────────────────────

export async function deliverFinalPackage(
  deliverableId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, deliverableId), {
    isFinalPackage: true,
    finalPackageDelivered: true,
    finalPackageDeliveredAt: serverTimestamp(),
    finalPackageDeliveredBy: userId,
    finalPackageDeliveryStatus: "delivered",
    status: "delivered",
    updatedAt: serverTimestamp(),
  });
}

// ─── Delivery Flow Settings ──────────────────────────────────────────────────

export async function updateDeliveryFlowSettings(
  deliverableId: string,
  settings: {
    enableFeedback?: boolean;
    enableReferrals?: boolean;
    enableReviews?: boolean;
    enableUpsell?: boolean;
  }
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (settings.enableFeedback !== undefined) updates["deliveryFlowSettings.enableFeedback"] = settings.enableFeedback;
  if (settings.enableReferrals !== undefined) updates["deliveryFlowSettings.enableReferrals"] = settings.enableReferrals;
  if (settings.enableReviews !== undefined) updates["deliveryFlowSettings.enableReviews"] = settings.enableReviews;
  if (settings.enableUpsell !== undefined) updates["deliveryFlowSettings.enableUpsell"] = settings.enableUpsell;
  updates.updatedAt = serverTimestamp();

  await updateDoc(doc(db, COLLECTION, deliverableId), updates);
}

export async function updateDeliveryProgress(
  deliverableId: string,
  step: string
): Promise<void> {
  const del = await getDeliverable(deliverableId);
  if (!del) throw new Error("Deliverable not found");

  const completedSteps = [...new Set([...del.deliveryProgress.completedSteps, step])];

  await updateDoc(doc(db, COLLECTION, deliverableId), {
    "deliveryProgress.completedSteps": completedSteps,
    "deliveryProgress.currentStep": step,
    updatedAt: serverTimestamp(),
  });
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function getUnreadVersionsForClient(
  projectId: string,
  clientId: string
): Promise<{ deliverableId: string; deliverableTitle: string; versionId: string; versionNumber: number }[]> {
  const deliverables = await getProjectDeliverables(projectId);
  const unread: { deliverableId: string; deliverableTitle: string; versionId: string; versionNumber: number }[] = [];

  for (const del of deliverables) {
    for (const v of del.versions) {
      if (!v.is_read && v.status === "submitted") {
        unread.push({
          deliverableId: del.id,
          deliverableTitle: del.title,
          versionId: v.id,
          versionNumber: v.versionNumber,
        });
      }
    }
  }

  return unread;
}

export async function getUnreadRevisionsForAgency(
  projectId: string
): Promise<{ deliverableId: string; deliverableTitle: string; revisionId: string }[]> {
  const deliverables = await getProjectDeliverables(projectId);
  const unread: { deliverableId: string; deliverableTitle: string; revisionId: string }[] = [];

  for (const del of deliverables) {
    for (const r of del.revisions) {
      if (!r.is_read) {
        unread.push({
          deliverableId: del.id,
          deliverableTitle: del.title,
          revisionId: r.id,
        });
      }
    }
  }

  return unread;
}
