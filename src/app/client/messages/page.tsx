"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { toast } from "@/lib/toast";
import type { Conversation } from "@/types";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Send,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientConversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface ClientMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date | null;
  pending?: boolean;
}

interface WorkspaceContact {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMessageTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMessageDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Conversation List ───────────────────────────────────────────────────────

function ConversationList({
  conversations,
  selectedId,
  userId,
  onSelect,
}: {
  conversations: ClientConversation[];
  selectedId: string | null;
  userId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {conversations.map((conv) => {
        const otherNames = conv.participantNames.filter(
          (_, i) => conv.participantIds[i] !== userId
        );
        const displayName = otherNames.join(", ") || "Team";
        const initial = displayName.charAt(0).toUpperCase();
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              isSelected
                ? "bg-primary/10"
                : "hover:bg-accent/50"
            )}
          >
            <Avatar className="h-9 w-9 border shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatMessageTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessage || "No messages yet"}
              </p>
            </div>
            {conv.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground shrink-0">
                {conv.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Message Thread ──────────────────────────────────────────────────────────

function MessageThread({
  conversationId,
  userId,
  displayName,
  workspaceId,
  onBack,
}: {
  conversationId: string;
  userId: string;
  displayName: string;
  workspaceId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time message subscription
  useEffect(() => {
    const msgsRef = collection(db, "messages");
    const q = query(
      msgsRef,
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const msgs: ClientMessage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            senderId: data.senderId || "",
            senderName: data.senderName || "Unknown",
            body: data.body || "",
            createdAt: (data.createdAt as Timestamp)?.toDate() ?? null,
          });
        });
        setMessages(msgs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark conversation as read
  useEffect(() => {
    const convRef = doc(db, "conversations", conversationId);
    updateDoc(convRef, { unreadCount: 0 }).catch(() => {});
  }, [conversationId]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Optimistic: add temp message
    const tempMsg: ClientMessage = {
      id: `temp_${Date.now()}`,
      senderId: userId,
      senderName: displayName,
      body: text,
      createdAt: new Date(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const msgsRef = collection(db, "messages");
      const docRef = await addDoc(msgsRef, {
        conversationId,
        workspaceId,
        senderId: userId,
        senderName: displayName,
        body: text,
        deleted: false,
        edited: false,
        readBy: [userId],
        createdAt: serverTimestamp(),
      });

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, id: docRef.id, pending: false } : m))
      );

      // Update conversation's lastMessage
      const convRef = doc(db, "conversations", conversationId);
      updateDoc(convRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      }).catch(() => {});
    } catch {
      // Rollback: remove temp message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, userId, displayName, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ClientMessage[] }[] = [];
  let currentGroup: { date: string; messages: ClientMessage[] } | null = null;

  for (const msg of messages) {
    if (!msg.createdAt) continue;
    const dateKey = msg.createdAt.toDateString();
    if (!currentGroup || currentGroup.date !== dateKey) {
      currentGroup = { date: dateKey, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">Messages</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
              >
                <Skeleton className={cn("h-12 w-3/4 rounded-lg")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Send a message to start the conversation!
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center mb-4">
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  {formatMessageDate(new Date(group.date))}
                </span>
              </div>
              {group.messages.map((msg) => {
                const isMe = msg.senderId === userId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex mb-3",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md",
                        msg.pending && "opacity-60"
                      )}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-medium mb-1 opacity-70">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"
                        )}
                      >
                        <span className="text-[10px]">
                          {msg.createdAt
                            ? msg.createdAt.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        {msg.pending && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── New Message Dialog ──────────────────────────────────────────────────────

function NewMessageDialog({
  open,
  onOpenChange,
  workspaceId,
  clientId,
  onSelectContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  clientId: string;
  onSelectContact: (contactId: string, contactName: string) => void;
}) {
  const [contacts, setContacts] = useState<WorkspaceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const wsSnap = await getDoc(doc(db, "workspaces", workspaceId));
        if (!wsSnap.exists()) {
          setContacts([]);
          return;
        }
        const memberIds: string[] = wsSnap.data()?.memberIds || [];
        if (memberIds.length === 0) {
          setContacts([]);
          return;
        }
        const usersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("__name__", "in", memberIds.slice(0, 10))
          )
        );
        const result: WorkspaceContact[] = [];
        usersSnap.forEach((d) => {
          const data = d.data();
          const role = data.workspaceRoles?.[workspaceId];
          if (
            d.id !== clientId &&
            (role === "owner" || role === "admin")
          ) {
            result.push({
              id: d.id,
              displayName: data.displayName || "Unknown",
              email: data.email || "",
              photoURL: data.photoURL || null,
            });
          }
        });
        setContacts(result);
      } catch {
        setError("Failed to load contacts");
        setContacts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, workspaceId, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Select a team member to start a conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4 text-center">{error}</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No contacts available
            </p>
          ) : (
            <div className="py-2 space-y-1">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id, contact.displayName)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <Avatar className="h-10 w-10 border shrink-0">
                    <AvatarImage src={contact.photoURL || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {contact.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contact.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Content (wrapped in Suspense) ────────────────────────────────

function ClientMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clientWorkspaceId, uid, displayName } = useClientUser();

  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use React state for selected conversation (not URL-dependent)
  const initialConvId = searchParams.get("conversation");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConvId);

  // Sync URL when selection changes (for bookmarking), without causing re-render
  useEffect(() => {
    if (selectedConversationId) {
      router.replace(`/client/messages?conversation=${selectedConversationId}`, { scroll: false });
    } else {
      router.replace("/client/messages", { scroll: false });
    }
  }, [selectedConversationId, router]);

  // Real-time conversations where client is a participant
  useEffect(() => {
    if (!clientWorkspaceId || !uid) return;

    const convRef = collection(db, "conversations");
    const q = query(
      convRef,
      where("workspaceId", "==", clientWorkspaceId),
      orderBy("lastMessageAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const filtered = snap.docs
          .map((d) => {
            const data = d.data() as Conversation;
            return {
              id: d.id,
              participantIds: data.participantIds || [],
              participantNames: data.participantNames || [],
              lastMessage: data.lastMessage || "",
              lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
              unreadCount: data.unreadCount || 0,
            };
          })
          .filter((c) => c.participantIds.includes(uid));

        setConversations(filtered);
        setLoading(false);
      },
      () => {
        setConversations([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [clientWorkspaceId, uid]);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
    },
    []
  );

  const goBackToList = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  const handleSelectContact = useCallback(
    async (contactId: string, contactName: string) => {
      setDialogOpen(false);
      try {
        const convId = nanoid();
        await setDoc(doc(db, "conversations", convId), {
          workspaceId: clientWorkspaceId,
          participantIds: [uid, contactId],
          participantNames: [displayName, contactName],
          type: "member",
          lastMessage: "",
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          unreadCount: 0,
        });
        setSelectedConversationId(convId);
      } catch {
        toast.error("Failed to create conversation");
      }
    },
    [clientWorkspaceId, uid, displayName]
  );

  return (
    <div className="h-[calc(100vh-8rem)] -m-4 sm:-m-6">
      <div className="flex h-full">
        {/* Conversation sidebar - hidden on mobile when a conversation is selected */}
        <div
          className={cn(
            "w-full lg:w-80 lg:border-r flex flex-col",
            selectedConversationId && "hidden lg:flex"
          )}
        >
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">Messages</h1>
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? "Loading..."
                    : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="shrink-0"
                title="New Message"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  When a team member messages you, it will appear here.
                </p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                userId={uid}
                onSelect={selectConversation}
              />
            )}
          </div>
        </div>

        {/* Message thread */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedConversationId && "hidden lg:flex"
          )}
        >
          {selectedConversationId ? (
            <MessageThread
              conversationId={selectedConversationId}
              userId={uid}
              displayName={displayName}
              workspaceId={clientWorkspaceId}
              onBack={goBackToList}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h2 className="text-lg font-semibold text-muted-foreground">
                Select a conversation
              </h2>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Choose a conversation from the list to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={clientWorkspaceId}
        clientId={uid}
        onSelectContact={handleSelectContact}
      />
    </div>
  );
}

// ─── Main Page Export - wrapped in Suspense for useSearchParams ─────────────

function ClientMessagesPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] -m-4 sm:-m-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    }>
      <ClientMessagesContent />
    </Suspense>
  );
}

export default function ClientMessagesPageWrapper() {
  return (
    <ModuleGuard moduleKey="messages">
      <ClientMessagesPage />
    </ModuleGuard>
  );
}
