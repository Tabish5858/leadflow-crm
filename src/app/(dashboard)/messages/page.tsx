"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageThread } from "@/components/messages/message-thread";
import { MessageInput } from "@/components/messages/message-input";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";
import { NewMemberConversationDialog } from "@/components/messages/new-member-conversation-dialog";
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  createConversation,
  deleteConversation,
  editMessage,
  deleteMessage,
  toggleReaction,
  fixConversationNames,
} from "@/lib/firebase/messages";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import { Search, Plus, Mail, Users, Video, Paperclip, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "@/components/ui/sonner";
import { getInitials } from "@/lib/utils";
import type { Conversation, Message, WorkspaceMember } from "@/types";

/** Show the OTHER participant's name for member conversations. */
function getConversationName(
  conv: Conversation,
  currentUserId: string,
  memberMap: Map<string, string>
): { name: string; detail: string; isMember: boolean } {
  const isMember = conv.type === "member" || (!conv.type && !(conv.leadName || conv.leadEmail));
  if (isMember) {
    const ids = conv.participantIds || [];
    const names = conv.participantNames || [];
    // Try index-aligned lookup first
    const idx = ids.findIndex((id) => id !== currentUserId);
    if (idx >= 0 && names[idx]) {
      return { name: names[idx], detail: "Workspace member", isMember: true };
    }
    // Fallback: look up by userId from workspace members
    const otherId = ids.find((id) => id !== currentUserId);
    if (otherId && memberMap.has(otherId)) {
      return { name: memberMap.get(otherId)!, detail: "Workspace member", isMember: true };
    }
    return { name: names[0] || "Team Member", detail: "Workspace member", isMember: true };
  }
  return {
    name: conv.leadName || "Unknown",
    detail: conv.leadEmail || "",
    isMember: false,
  };
}

export default function MessagesPage() {
  const { activeWorkspace, user } = useWorkspace();
  const { firebaseUser } = useAuth();

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [convsError, setConvsError] = useState<string | null>(null);

  // Selected conversation
  const [selected, setSelected] = useState<Conversation | null>(null);

  // Workspace members (for member list without conversations)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  // Draft member (clicked a member without an existing conversation)
  const [draftMember, setDraftMember] = useState<WorkspaceMember | null>(null);

  // Messages for selected conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsError, setMsgsError] = useState<string | null>(null);

  // Search & dialogs
  const [searchQuery, setSearchQuery] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  // Delete conversation
  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);

  // Google Meet creation state
  const [creatingMeet, setCreatingMeet] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ─── Subscribe to conversations (real-time) ─────────────────────────

  useEffect(() => {
    if (!activeWorkspace) return;

    setConvsLoading(true);
    setConvsError(null);

    const unsub = subscribeToConversations(
      activeWorkspace.id,
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
  }, [activeWorkspace]);

  // ─── Fetch workspace members (once) ──────────────────────────────────

  useEffect(() => {
    if (!activeWorkspace) return;
    getWorkspaceMembers(activeWorkspace.id)
      .then(setWorkspaceMembers)
      .catch(() => toast.error("Failed to load workspace members"));
  }, [activeWorkspace]);

  // ─── Fix old conversations with misaligned participantNames ──────────

  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    if (migrated || conversations.length === 0 || workspaceMembers.length === 0) return;

    const memberMapForMigration = new Map(workspaceMembers.map((m) => [m.userId, m.displayName]));
    fixConversationNames(conversations, memberMapForMigration)
      .then((count) => {
        if (count > 0) {
          // Migration complete — names synced
        }
      })
      .catch(() => {})
      .finally(() => setMigrated(true));
  }, [migrated, conversations, workspaceMembers]);

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

    const unsub = subscribeToMessages(
      selected.id,
      (msgs) => {
        setMessages(msgs);
        setMsgsLoading(false);
        setMsgsError(null);
      },
      (err) => {
        setMsgsError(err.message || "Failed to load messages");
        setMsgsLoading(false);
        toast.error("Failed to load messages");
      }
    );

    return () => unsub();
  }, [selected]);

  // ─── Auto-detect newly created member conversation ───────────────────

  useEffect(() => {
    if (!draftMember || !user) return;
    // When onSnapshot delivers conversations, check if one was created for this member
    const match = conversations.find(
      (c) =>
        c.type === "member" &&
        c.participantIds?.includes(user.id) &&
        c.participantIds?.includes(draftMember.userId)
    );
    if (match && !selected) {
      setSelected(match);
      setDraftMember(null);
    }
  }, [conversations, draftMember, selected, user]);

  // ─── Select conversation (no double-fetch — snapshot handles it) ──────

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelected(conv);
    setDraftMember(null);
  }, []);

  // ─── Select member (show draft until first message creates convo) ──────

  const handleSelectMember = useCallback(
    (member: WorkspaceMember) => {
      // Check if conversation already exists
      const existing = conversations.find(
        (c) =>
          c.type === "member" &&
          c.participantIds?.includes(user?.id || "") &&
          c.participantIds?.includes(member.userId)
      );
      if (existing) {
        setSelected(existing);
        setDraftMember(null);
        return;
      }
      // No conversation yet — enter draft mode
      setSelected(null);
      setDraftMember(member);
      setMessages([]);
    },
    [conversations, user]
  );

  // ─── Edit message ─────────────────────────────────────────────────────

  const handleEditMessage = useCallback(
    async (messageId: string, newBody: string) => {
      await editMessage(messageId, newBody);
    },
    []
  );

  // ─── Delete message ───────────────────────────────────────────────────

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      toast.success("Message deleted");
    },
    []
  );

  // ─── Delete conversation ──────────────────────────────────────────────

  const handleDeleteConversation = useCallback(
    async (conv: Conversation) => {
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

  // ─── Send Google Meet link (real, via Calendar API) ──────────────

  const handleSendMeetLink = useCallback(async () => {
    if (!selected || !user || !activeWorkspace) return;

    setCreatingMeet(true);
    try {
      const attendees: { email: string; name?: string }[] = [];

      if (selected.type === "lead" && selected.leadEmail) {
        attendees.push({ email: selected.leadEmail, name: selected.leadName });
      } else if (selected.type === "member") {
        const otherId = selected.participantIds?.find((id) => id !== user.id);
        const otherMember = workspaceMembers.find((m) => m.userId === otherId);
        if (otherMember) {
          attendees.push({ email: otherMember.email, name: otherMember.displayName });
        }
      }

      if (attendees.length === 0) {
        toast.error("No attendees found for this conversation");
        return;
      }

      const res = await fetch("/api/meetings/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          workspaceId: activeWorkspace.id,
          attendees,
          conversationId: selected.id,
          leadId: selected.leadId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsCalendarAuth) {
          toast.error("Please connect Google Calendar in Settings > Integrations");
        } else {
          toast.error(data.error || "Failed to create meeting");
        }
        return;
      }

      // Send the meeting card as a message
      await sendMessage({
        workspaceId: activeWorkspace.id,
        conversationId: selected.id,
        senderId: user.id,
        senderName: user.displayName || "Unknown",
        body: "Google Meet",
        meetingCard: {
          meetLink: data.meetLink,
          calendarEventUrl: data.calendarEventUrl,
          status: "active",
        },
      });

      toast.success("Google Meet created");
    } catch {
      toast.error("Failed to create meeting");
    } finally {
      setCreatingMeet(false);
    }
  }, [selected, user, activeWorkspace, workspaceMembers]);

  // ─── Send message ────────────────────────────────────────────────────

  /** Upload file to Cloudinary via API, return attachment data */
  const uploadAndAttachFile = useCallback(async (file: File) => {
    setPendingFile(file);
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", activeWorkspace?.id || "");
      formData.append("leadId", selected?.leadId || "");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      const attachment = {
        type: (file.type.startsWith("image/") ? "image" : "document") as "image" | "document",
        url: data.url || data.cloudinaryUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };

      return attachment;
    } finally {
      setUploadingFile(false);
      setPendingFile(null);
    }
  }, [activeWorkspace, selected]);

  // Listen for file selection from MessageInput
  useEffect(() => {
    const handler = async (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (!file || !user || !activeWorkspace) return;

      const attachment = await uploadAndAttachFile(file);
      if (!attachment) return;

      // Create conversation if in draft mode
      let convoId = selected?.id;
      if (draftMember && !convoId) {
        convoId = await createConversation({
          workspaceId: activeWorkspace.id,
          type: "member",
          participantIds: [user.id, draftMember.userId],
          participantNames: [user.displayName || "You", draftMember.displayName],
        });
        setDraftMember(null);
      }

      if (!convoId) {
        toast.error("Select a conversation first");
        return;
      }

      await sendMessage({
        workspaceId: activeWorkspace.id,
        conversationId: convoId,
        senderId: user.id,
        senderName: user.displayName || "Unknown",
        body: "",
        attachment,
      });
    };

    window.addEventListener("message-file-selected", handler);
    return () => window.removeEventListener("message-file-selected", handler);
  }, [user, activeWorkspace, selected, draftMember, uploadAndAttachFile]);

  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!user || !activeWorkspace) return;

      // Draft mode — create conversation + send first message
      if (draftMember && !selected) {
        const convoId = await createConversation({
          workspaceId: activeWorkspace.id,
          type: "member",
          participantIds: [user.id, draftMember.userId],
          participantNames: [user.displayName || "You", draftMember.displayName],
        });
        // The onSnapshot will pick up the new conversation.
        // We need to send the message immediately — but sendMessage needs conversationId.
        // Send message to the new conversation, then the onSnapshot subscription
        // will kick in when 'selected' is set.

        // Wait briefly for the conversation to appear in onSnapshot,
        // then select it and send the message
        // Actually — send the message now with the known convoId
        await sendMessage({
          workspaceId: activeWorkspace.id,
          conversationId: convoId,
          senderId: user.id,
          senderName: user.displayName || "Unknown",
          body,
        });
        // Clear draft and wait for onSnapshot to pick up the new conversation
        setDraftMember(null);
        setMessages([
          {
            id: "temp",
            conversationId: convoId,
            workspaceId: activeWorkspace.id,
            senderId: user.id,
            senderName: user.displayName || "Unknown",
            body,
            deleted: false,
            edited: false,
            createdAt: Timestamp.now(),
          },
        ]);
        // onSnapshot will update conversations list, and our auto-detect
        // useEffect will select the right one
        return;
      }

      if (!selected) return;

      await sendMessage({
        workspaceId: activeWorkspace.id,
        conversationId: selected.id,
        senderId: user.id,
        senderName: user.displayName || "Unknown",
        body,
      });
    },
    [selected, draftMember, user, activeWorkspace]
  );

  // ─── Create new lead conversation ─────────────────────────────────────

  const handleCreateConversation = useCallback(
    async (lead: { id: string; firstName: string; lastName: string; email: string }) => {
      if (!activeWorkspace) return;
      const leadName = `${lead.firstName} ${lead.lastName}`;
      await createConversation({
        workspaceId: activeWorkspace.id,
        type: "lead",
        leadId: lead.id,
        leadName,
        leadEmail: lead.email,
      });
      toast.success(`Conversation started with ${leadName}`);
    },
    [activeWorkspace]
  );

  // ─── Create new member conversation ───────────────────────────────────

  const handleCreateMemberConversation = useCallback(
    async (member: { userId: string; displayName: string; email: string }) => {
      if (!activeWorkspace || !user) return;
      // Check if conversation already exists between these two members
      const existing = conversations.find(
        (c) =>
          c.type === "member" &&
          c.participantIds?.includes(user.id) &&
          c.participantIds?.includes(member.userId)
      );
      if (existing) {
        setSelected(existing);
        setDraftMember(null);
        setNewMemberOpen(false);
        toast.info(`Already have a conversation with ${member.displayName}`);
        return;
      }
      await createConversation({
        workspaceId: activeWorkspace.id,
        type: "member",
        participantIds: [user.id, member.userId],
        participantNames: [user.displayName || "You", member.displayName],
      });
      toast.success(`Conversation started with ${member.displayName}`);
    },
    [activeWorkspace, user, conversations]
  );

  // ─── Search filter ───────────────────────────────────────────────────

  // ─── Member name lookup map ──────────────────────────────────────────

  const memberMap = useMemo(
    () => new Map(workspaceMembers.map((m) => [m.userId, m.displayName])),
    [workspaceMembers]
  );

  // ─── Filtered data ────────────────────────────────────────────────────

  const filteredConversations = conversations.filter((c) => {
    const { name, detail } = getConversationName(c, user?.id || "", memberMap);
    const q = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      detail.toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  });

  // Members without an existing conversation (exclude current user)
  const membersWithoutConvo = workspaceMembers.filter(
    (m) =>
      m.userId !== user?.id &&
      !filteredConversations.some(
        (c) =>
          c.type === "member" &&
          c.participantIds?.includes(m.userId) &&
          c.participantIds?.includes(user?.id || "")
      )
  );

  // If search is active, filter members too
  const filteredMembers = searchQuery
    ? membersWithoutConvo.filter(
        (m) =>
          m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : membersWithoutConvo;

  // ─── Toggle reaction ──────────────────────────────────────────────────

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      await toggleReaction(messageId, emoji, user.id);
    },
    [user]
  );

  // ─── No workspace state ──────────────────────────────────────────────

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Messages"
          description="Real-time messaging with leads and team members."
        />
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          title="Messages"
          description="Real-time messaging with leads and team members."
        />

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-3">
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
              conversations={filteredConversations}
              members={filteredMembers}
              selectedId={selected?.id ?? (draftMember ? `member_${draftMember.userId}` : null)}
              currentUserId={user?.id || ""}
              memberMap={memberMap}
              onSelectConversation={handleSelectConversation}
              onSelectMember={handleSelectMember}
              onDeleteConversation={handleDeleteConversation}
              loading={convsLoading}
              error={convsError}
            />
          </div>

          {/* Action buttons */}
          <div className="border-t p-2 space-y-1.5">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setNewConvOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Message Lead
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setNewMemberOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Message Member
            </Button>
          </div>
        </div>

        {/* ─── Message Thread (Right) ───────────────────────────────────── */}
        <div className="flex flex-col rounded-lg border bg-card lg:col-span-2">
          {selected ? (
            <>
              {/* Conversation header */}
              <div className="border-b px-4 py-3">
                {(() => {
                  const { name, detail, isMember } = getConversationName(selected, user?.id || "", memberMap);
                  return (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className={`text-xs ${isMember ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <MessageThread
                messages={messages}
                currentUserId={user?.id ?? ""}
                loading={msgsLoading}
                error={msgsError}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
              />

              {/* Input */}
              <div className="border-t px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={handleSendMeetLink}
                    title="Send Google Meet link"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <MessageInput
                      onSend={handleSendMessage}
                      placeholder={`Message ${getConversationName(selected, user?.id || "", memberMap).name.split(" ")[0]}...`}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : draftMember ? (
            /* Draft mode — member selected, no conversation yet */
            <>
              <div className="border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                      {getInitials(draftMember.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {draftMember.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {draftMember.email}
                    </p>
                  </div>
                </div>
              </div>

              <MessageThread
                messages={[]}
                currentUserId={user?.id || ""}
                loading={false}
                error={null}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
              />

              <div className="border-t p-4">
                <MessageInput
                  onSend={handleSendMessage}
                  placeholder={`Message ${draftMember.displayName.split(" ")[0]}...`}
                />
              </div>
            </>
          ) : (
            /* Empty state — no conversation selected */
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <Mail className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-foreground">
                Select a conversation
              </h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Choose a conversation from the list, message a lead, or start a chat with a team member.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewConvOpen(true)}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Message Lead
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewMemberOpen(true)}
                >
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Message Member
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {activeWorkspace && (
        <>
          <NewConversationDialog
            open={newConvOpen}
            onOpenChange={setNewConvOpen}
            workspaceId={activeWorkspace.id}
            onCreateConversation={handleCreateConversation}
          />
          <NewMemberConversationDialog
            open={newMemberOpen}
            onOpenChange={setNewMemberOpen}
            workspaceId={activeWorkspace.id}
            currentUserId={user?.id || ""}
            onCreateConversation={handleCreateMemberConversation}
          />
        </>
      )}

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
  );
}
