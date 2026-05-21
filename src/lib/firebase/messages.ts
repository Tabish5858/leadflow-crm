import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const MESSAGES_COLLECTION = "messages";
const CONVERSATIONS_COLLECTION = "conversations";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Timestamp;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadCount: number;
  createdAt: Timestamp;
}

export async function getConversations(workspaceId: string): Promise<Conversation[]> {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("lastMessageAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
}

export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });

  // Update conversation last message
  const { updateDoc, doc } = await import("firebase/firestore");
  const convRef = doc(db, CONVERSATIONS_COLLECTION, data.conversationId);
  await updateDoc(convRef, {
    lastMessage: data.body.slice(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function createConversation(data: {
  workspaceId: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    ...data,
    lastMessage: "",
    lastMessageAt: Timestamp.now(),
    unreadCount: 0,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}
