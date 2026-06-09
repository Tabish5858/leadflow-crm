"use client";

import { ConversationList, type ConversationSection } from "@/components/messages/conversation-list";
import { MessageInput } from "@/components/messages/message-input";
import { MessageThread } from "@/components/messages/message-thread";
import { NewMemberConversationDialog } from "@/components/messages/new-member-conversation-dialog";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  createConversation,
  deleteConversation,
  deleteMessage,
  editMessage,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
  toggleReaction,
  markConversationAsRead,
} from "@/lib/firebase/messages";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import { getApiAuthHeaders } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { getInitials } from "@/lib/utils";
import type { Conversation, Message, WorkspaceMember } from "@/types";
import { Plus, Mail, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function ClientMessagesPage() {
  const { clientWorkspaceId, uid, displayName } = useClientUser();

  // ─── State ──────────────────────────────────────────────────────────────

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [convsError, setConvsError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Conversation | null>(null);

  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsError, setMsgsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);

  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ─── Subscribe to conversations (real-time) ──────────────────────────────

  useEffect(() => {
    if (!clientWorkspaceId) return;

    setConvsLoading(true);
    setConvsError(null);

    const unsub = subscribeToConversations(
      clientWorkspaceId,
      (convs) => {
        setConversations(convs);
        setConvsLoading(false);
        setConvsError(null);
      },
      (err) => {
        setConvsError(err.message || "Failed to load conversations");
        setConvsLoading(false);
        toast.error("Failed to load conversations");
      }
    );

    return () => unsub();
  }, [clientWorkspaceId]);

  // ─── Auto-select most recent conversation on first load ────────────────

  const [initialAutoSelectDone, setInitialAutoSelectDone] = useState(false);

  useEffect(() => {
    if (initialAutoSelectDone || selected || conversations.length === 0 || !uid) return;

    const myConvs = conversations.filter(
      (c) => c.participantIds?.includes(uid)
    );
    if (myConvs.length === 0) return;

    const sorted = [...myConvs].sort((a, b) => {
      const aTime = a.lastMessageAt?.toMillis() || 0;
      const bTime = b.lastMessageAt?.toMillis() || 0;
      return bTime - aTime;
    });

    setSelected(sorted[0]);
    setInitialAutoSelectDone(true);
  }, [initialAutoSelectDone, selected, conversations, uid]);

  // ─── Fetch workspace members (once) ─────────────────────────────────────

  useEffect(() => {
    if (!clientWorkspaceId) return;
    getWorkspaceMembers(clientWorkspaceId)
      .then(setWorkspaceMembers)
      .catch(() => toast.error("Failed to load workspace members"));
  }, [clientWorkspaceId]);

  // ─── Subscribe to messages for selected conversation (real-time) ──────

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setMsgsLoading(false);
      setMsgsError(null);
      return;
    }

    setMsgsLoading(true);
    setMsgsError(null);

    if (!clientWorkspaceId) return;

    const unsub = subscribeToMessages(
      selected.id,
      (msgs) => {
        setMessages(msgs);
        setMsgsLoading(false);
        setMsgsError(null);
      },
      clientWorkspaceId,
      (err) => {
        setMsgsError(err.message || "Failed to load messages");
        setMsgsLoading(false);
        toast.error("Failed to load messages");
      }
    );

    return () => unsub();
  }, [selected, clientWorkspaceId]);

  // ─── Mark conversation as read ────────────────────────────────────────

  useEffect(() => {
    if (!selected || !uid || !clientWorkspaceId) return;
    markConversationAsRead(selected.id, uid, clientWorkspaceId);
  }, [selected, uid, clientWorkspaceId, messages]);

  // ─── Select conversation ─────────────────────────────────────────────

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelected(conv);
  }, []);

  // ─── Send message ───────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (body: string, _attachment?: unknown, msgReplyTo?: string, msgReplyPreview?: string) => {
      if (!uid || !clientWorkspaceId || !selected) return;

      await sendMessage({
        workspaceId: clientWorkspaceId,
        conversationId: selected.id,
        senderId: uid,
        senderName: displayName,
        body,
        replyTo: msgReplyTo,
        replyPreview: msgReplyPreview,
      });
      setReplyTo(null);
      setReplyPreview(null);
    },
    [selected, uid, displayName, clientWorkspaceId]
  );

  // ─── Edit message ──────────────────────────────────────────────────

  const handleEditMessage = useCallback(
    async (messageId: string, newBody: string) => {
      await editMessage(messageId, newBody);
    },
    []
  );

  // ─── Delete message ────────────────────────────────────────────────

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      toast.success("Message deleted");
    },
    []
  );

  // ─── Reply to message ─────────────────────────────────────────────

  const handleReply = useCallback((messageId: string, preview: string) => {
    setReplyTo(messageId);
    setReplyPreview(preview);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
    setReplyPreview(null);
  }, []);

  // ─── Toggle reaction ──────────────────────────────────────────────

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!uid) return;
      await toggleReaction(messageId, emoji, uid);
    },
    [uid]
  );

  // ─── Delete conversation ──────────────────────────────────────────

  const handleDeleteConversation = useCallback(
    (conv: Conversation) => {
      setDeleteConvTarget(conv);
    },
    []
  );

  const handleConfirmDeleteConversation = useCallback(async () => {
    if (!deleteConvTarget) return;
    setDeletingConv(true);
    try {
      await deleteConversation(deleteConvTarget.id);
      if (selected?.id === deleteConvTarget.id) {
        setSelected(null);
        setMessages([]);
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setDeletingConv(false);
      setDeleteConvTarget(null);
    }
  }, [deleteConvTarget, selected]);

  // ─── Create new member conversation ───────────────────────────────

  const handleCreateMemberConversation = useCallback(
    async (member: WorkspaceMember) => {
      if (!clientWorkspaceId || !uid) return;

      if (member.role === "client") {
        toast.error("Cannot start conversations with other clients");
        return;
      }

      // Check if conversation already exists
      const existing = conversations.find(
        (c) =>
          c.type === "member" &&
          c.participantIds?.includes(uid) &&
          c.participantIds?.includes(member.userId)
      );
      if (existing) {
        setSelected(existing);
        setNewMessageOpen(false);
        toast.info(`Already have a conversation with ${member.displayName}`);
        return;
      }

      await createConversation({
        workspaceId: clientWorkspaceId,
        type: "member",
        participantIds: [uid, member.userId],
        participantNames: [displayName, member.displayName],
      });
      toast.success(`Conversation started with ${member.displayName}`);
    },
    [clientWorkspaceId, uid, displayName, conversations]
  );

  // ─── Upload file to Cloudinary ────────────────────────────────────

  const uploadAndAttachFile = useCallback(
    async (file: File) => {
      setPendingFile(file);
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const authHeaders = clientWorkspaceId
          ? await getApiAuthHeaders(clientWorkspaceId)
          : {};
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: authHeaders,
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(errBody.error || "Upload failed");
        }

        const data = await res.json();

        return {
          type: (file.type.startsWith("image/") ? "image" : "document") as "image" | "document",
          url: data.url || data.cloudinaryUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type,
        };
      } finally {
        setUploadingFile(false);
        setPendingFile(null);
      }
    },
    [clientWorkspaceId]
  );

  // Listen for file selection from MessageInput
  useEffect(() => {
    const handler = async (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (!file || !uid || !clientWorkspaceId || !selected) return;

      try {
        const attachment = await uploadAndAttachFile(file);
        if (!attachment) return;

        await sendMessage({
          workspaceId: clientWorkspaceId,
          conversationId: selected.id,
          senderId: uid,
          senderName: displayName,
          body: "",
          attachment,
        });
      } catch {
        toast.error("Failed to upload file. Try again.");
      }
    };

    window.addEventListener("message-file-selected", handler);
    return () => window.removeEventListener("message-file-selected", handler);
  }, [uid, clientWorkspaceId, selected, displayName, uploadAndAttachFile]);

  // ─── Derived data ──────────────────────────────────────────────────────

  const memberMap = useMemo(
    () => new Map(workspaceMembers.map((m) => [m.userId, m.displayName])),
    [workspaceMembers]
  );

  // Only show conversations where the client is a participant
  const myConversations = conversations.filter(
    (c) => c.participantIds?.includes(uid || "")
  );

  const filteredConversations = myConversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const otherIdx = (c.participantIds || []).findIndex((id) => id !== uid);
    const otherName = otherIdx >= 0 ? (c.participantNames || [])[otherIdx] || "" : c.groupName || "";
    return (
      otherName.toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  });

  const conversationSections = useMemo((): ConversationSection[] => [
    { key: "team", label: "Messages", conversations: filteredConversations },
  ], [filteredConversations]);

  // Workspace members without an existing conversation (exclude self + other clients)
  const membersWithoutConvo = workspaceMembers.filter(
    (m) =>
      m.userId !== uid &&
      m.role !== "client" &&
      !myConversations.some(
        (c) =>
          c.type === "member" &&
          c.participantIds?.includes(m.userId) &&
          c.participantIds?.includes(uid || "")
      )
  );

  const filteredMembers = searchQuery
    ? membersWithoutConvo.filter(
        (m) =>
          m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : membersWithoutConvo;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <ModuleGuard moduleKey="messages">
      <div className="space-y-6">
        <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ─── Conversation List (Left) ─────────────────────────────────── */}
          <div className="flex flex-col rounded-lg border bg-card lg:col-span-1">
            {/* Search bar */}
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                sections={conversationSections}
                members={filteredMembers}
                clientMembers={[]}
                selectedId={selected?.id ?? null}
                currentUserId={uid || ""}
                memberMap={memberMap}
                onSelectConversation={handleSelectConversation}
                onSelectMember={() => {}} // Handled via NewMessageDialog
                onDeleteConversation={handleDeleteConversation}
                loading={convsLoading}
                error={convsError}
              />
            </div>

            {/* New message button */}
            <div className="border-t p-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setNewMessageOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </div>
          </div>

          {/* ─── Message Thread (Right) ───────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden rounded-lg border bg-card lg:col-span-2">
            {selected ? (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                      {getInitials(getOtherParticipantName(selected, uid || ""))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getOtherParticipantName(selected, uid || "")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.groupName ? `${(selected.participantIds || []).length} members` : "Workspace member"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <MessageThread
                  messages={messages}
                  currentUserId={uid || ""}
                  loading={msgsLoading}
                  error={msgsError}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onToggleReaction={handleToggleReaction}
                  onReply={handleReply}
                />

                {/* Input */}
                <div className="border-t px-4 py-3">
                  <MessageInput
                    onSend={handleSendMessage}
                    placeholder={`Message ${getOtherParticipantName(selected, uid || "").split(" ")[0]}...`}
                    uploading={uploadingFile}
                    pendingFile={pendingFile}
                    onClearFile={() => { setPendingFile(null); }}
                    replyTo={replyTo}
                    replyPreview={replyPreview}
                    onCancelReply={handleCancelReply}
                  />
                </div>
              </>
            ) : (
              /* Empty state - no conversation selected */
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Mail className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="mt-4 text-sm font-medium text-foreground">
                  Select a conversation
                </h3>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Choose a conversation from the list or start a new one.
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessageOpen(true)}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    New Message
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Dialogs ───────────────────────────────────────────────────── */}

        <NewMemberConversationDialog
          open={newMessageOpen}
          onOpenChange={setNewMessageOpen}
          workspaceId={clientWorkspaceId}
          currentUserId={uid || ""}
          onCreateConversation={handleCreateMemberConversation}
        />

        {/* Delete conversation dialog */}
        <Dialog open={!!deleteConvTarget} onOpenChange={() => setDeleteConvTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete conversation?</DialogTitle>
              <DialogDescription>
                This will permanently delete the chat and all messages.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteConvTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteConversation}
                disabled={deletingConv}
              >
                {deletingConv ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGuard>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

/** Get the display name of the other participant(s) in a conversation. */
function getOtherParticipantName(conv: Conversation, currentUserId: string): string {
  const ids = conv.participantIds || [];
  const names = conv.participantNames || [];

  // Group conversation
  if (conv.groupName) return conv.groupName;

  if (ids.length > 2) {
    const otherNames = ids
      .filter((id) => id !== currentUserId)
      .map((id) => {
        const idx = ids.indexOf(id);
        return names[idx] || "Member";
      });
    const display = otherNames.slice(0, 2).join(", ");
    const suffix = otherNames.length > 2 ? ` +${otherNames.length - 2}` : "";
    return display + suffix;
  }

  // 1:1 conversation
  const otherIdx = ids.findIndex((id) => id !== currentUserId);
  return otherIdx >= 0 && names[otherIdx] ? names[otherIdx] : "Team Member";
}
