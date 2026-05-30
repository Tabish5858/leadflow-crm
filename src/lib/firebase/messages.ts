import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Message, Conversation } from "@/types";

const MESSAGES_COLLECTION = "messages";
const CONVERSATIONS_COLLECTION = "conversations";

// ─── Conversations (one-shot) ────────────────────────────────────────────────

export async function getConversations(
  workspaceId: string
): Promise<Conversation[]> {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("lastMessageAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Conversation
  );
}

// ─── Conversations (real-time) ───────────────────────────────────────────────

export function subscribeToConversations(
  workspaceId: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const conversations = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Conversation
      );
      callback(conversations);
    },
    (error) => {
      console.error("Failed to subscribe to conversations:", error);
      onError?.(error);
    }
  );
}

// ─── Messages (one-shot) ─────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  workspaceId?: string
): Promise<Message[]> {
  const constraints: QueryConstraint[] = [where("conversationId", "==", conversationId)];
  if (workspaceId) constraints.push(where("workspaceId", "==", workspaceId));
  constraints.push(orderBy("createdAt", "asc"));
  const q = query(collection(db, MESSAGES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Message
  );
}

// ─── Messages (real-time) ────────────────────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  workspaceId?: string,
  onError?: (error: Error) => void
): () => void {
  const constraints: QueryConstraint[] = [where("conversationId", "==", conversationId)];
  if (workspaceId) constraints.push(where("workspaceId", "==", workspaceId));
  constraints.push(orderBy("createdAt", "asc"));
  const q = query(collection(db, MESSAGES_COLLECTION), ...constraints);

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const messages = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Message
      );
      callback(messages);
    },
    (error) => {
      console.error("Failed to subscribe to messages:", error);
      onError?.(error);
    }
  );
}

// ─── Send Message ────────────────────────────────────────────────────────────

export async function sendMessage(data: {
  workspaceId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  attachment?: Message["attachment"];
  meetingCard?: Message["meetingCard"];
  replyTo?: string;
  replyPreview?: string;
  mentions?: string[];
}): Promise<string> {
  const docData: Record<string, unknown> = {
    conversationId: data.conversationId,
    workspaceId: data.workspaceId,
    senderId: data.senderId,
    senderName: data.senderName,
    body: data.body,
    deleted: false,
    edited: false,
    readBy: [data.senderId], // Initialize with sender so readBy is never empty
    createdAt: serverTimestamp(),
  };

  if (data.attachment) docData.attachment = data.attachment;
  if (data.meetingCard) docData.meetingCard = data.meetingCard;
  if (data.replyTo) docData.replyTo = data.replyTo;
  if (data.replyPreview) docData.replyPreview = data.replyPreview;
  if (data.mentions?.length) docData.mentions = data.mentions;

  const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), docData);

  // Update conversation's last message preview + unread count
  try {
    const preview = data.meetingCard ? "📹 Google Meet" : data.attachment ? `📎 ${data.attachment.name}` : data.body.slice(0, 100);
    const convRef = doc(db, CONVERSATIONS_COLLECTION, data.conversationId);
    const convSnap = await getDoc(convRef);
    const convData = convSnap.data();
    const currentUnread = convData?.unreadCount || 0;
    await updateDoc(convRef, {
      lastMessage: preview,
      lastMessageAt: serverTimestamp(),
      unreadCount: currentUnread + 1,
    });
  } catch {
    console.warn("Failed to update conversation preview");
  }

  return docRef.id;
}

// ─── Edit Message ────────────────────────────────────────────────────────────

export async function editMessage(
  messageId: string,
  newBody: string
): Promise<void> {
  const msgRef = doc(db, MESSAGES_COLLECTION, messageId);
  await updateDoc(msgRef, {
    body: newBody,
    edited: true,
    editedAt: serverTimestamp(),
  });
}

// ─── Delete Message (soft) ───────────────────────────────────────────────────

export async function deleteMessage(messageId: string): Promise<void> {
  const msgRef = doc(db, MESSAGES_COLLECTION, messageId);
  await updateDoc(msgRef, {
    deleted: true,
    body: "",
    edited: false,
  });
}

// ─── Delete Conversation ─────────────────────────────────────────────────────

export async function deleteConversation(conversationId: string, workspaceId?: string): Promise<void> {
  // Delete all messages in the conversation
  const constraints: QueryConstraint[] = [where("conversationId", "==", conversationId)];
  if (workspaceId) constraints.push(where("workspaceId", "==", workspaceId));
  const msgsQuery = query(collection(db, MESSAGES_COLLECTION), ...constraints);
  const msgsSnapshot = await getDocs(msgsQuery);
  const batch: Array<Promise<void>> = [];
  msgsSnapshot.docs.forEach((d) => {
    batch.push(deleteDoc(doc(db, MESSAGES_COLLECTION, d.id)));
  });
  await Promise.all(batch);

  // Delete the conversation document
  await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
}

// ─── Create Conversation ─────────────────────────────────────────────────────

export async function createConversation(data: {
  workspaceId: string;
  type: "lead" | "member";
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  participantIds?: string[];
  participantNames?: string[];
}): Promise<string> {
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    workspaceId: data.workspaceId,
    type: data.type,
    leadId: data.leadId ?? "",
    leadName: data.leadName ?? "",
    leadEmail: data.leadEmail ?? "",
    participantIds: data.participantIds ?? [],
    participantNames: data.participantNames ?? [],
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadCount: 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ─── Exports for backward compatibility ──────────────────────────────────────

export type { Message, Conversation };

// ─── Reaction Toggle ───────────────────────────────────────────────────────

export async function toggleReaction(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, MESSAGES_COLLECTION, messageId);
  const snap = await getDoc(msgRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const reactions: Record<string, string[]> = data.reactions || {};

  const userList = reactions[emoji] || [];
  const hasReacted = userList.includes(userId);

  if (hasReacted) {
    // Remove reaction
    const updated = userList.filter((id) => id !== userId);
    if (updated.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = updated;
    }
  } else {
    // Add reaction
    reactions[emoji] = [...userList, userId];
  }

  await updateDoc(msgRef, { reactions });
}

// ─── Fix misaligned participantNames in old conversations ────────────────────

/**
 * Old conversations stored participantNames with only the invitee's name,
 * but participantIds always has both. This caused the wrong name to show
 * when the invitee views the conversation.
 *
 * This migration syncs participantNames by looking up workspace members.
 */
export async function fixConversationNames(
  conversations: Conversation[],
  memberDisplayNames: Map<string, string>
): Promise<number> {
  let fixed = 0;

  for (const conv of conversations) {
    if (conv.type !== "member") continue;
    const ids = conv.participantIds || [];
    const names = conv.participantNames || [];

    // Already aligned — skip
    if (names.length === ids.length) continue;

    // Build correct names from workspace members
    const correctNames = ids.map((id) => memberDisplayNames.get(id) || "Team Member");

    // Only update if something changed
    const changed = correctNames.some((n, i) => n !== (names[i] || ""));
    if (!changed) continue;

    try {
      const convRef = doc(db, CONVERSATIONS_COLLECTION, conv.id);
      await updateDoc(convRef, { participantNames: correctNames });
      fixed++;
    } catch {
      console.warn(`Failed to fix participantNames for conversation ${conv.id}`);
    }
  }

  return fixed;
}

// ─── Read Receipts ─────────────────────────────────────────────────────────

/**
 * Mark messages as read by the current user.
 * Adds userId to each message's readBy array (if not already present).
 */
export async function markMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<void> {
  if (!messageIds.length || !userId) return;

  const batch = writeBatch(db);
  for (const id of messageIds) {
    const msgRef = doc(db, MESSAGES_COLLECTION, id);
    // Read the doc to get current readBy array
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data();
      const readBy: string[] = data.readBy || [];
      if (!readBy.includes(userId)) {
        batch.update(msgRef, { readBy: [...readBy, userId] });
      }
    }
  }
  await batch.commit();
}

/**
 * Mark a conversation as read by the current user.
 * Resets unreadCount to 0. Individual message readBy is handled on send.
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  if (!conversationId || !userId) return;

  try {
    // Reset unread count on conversation
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(convRef, { unreadCount: 0 });

    // Also update readBy on messages this user RECEIVED (not sent by them)
    // Use individual updates instead of batch to avoid silent failures
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId)
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const readBy: string[] = data.readBy || [];
      if (!readBy.includes(userId)) {
        try {
          await updateDoc(docSnap.ref, {
            readBy: [...readBy, userId],
          });
        } catch {
          // Individual message update failed — continue with others
        }
      }
    }
  } catch {
    // Non-critical — read receipts are best-effort
  }
}
