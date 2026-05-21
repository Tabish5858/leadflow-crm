"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getConversations, getMessages, sendMessage, createConversation, type Conversation, type Message } from "@/lib/firebase/messages";
import { Mail, Send, Search, Plus, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getInitials } from "@/lib/utils";

export default function MessagesPage() {
  const { activeWorkspace, user } = useWorkspace();
  const { firebaseUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoadingConversations(true);
    getConversations(activeWorkspace.id)
      .then(setConversations)
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoadingConversations(false));
  }, [activeWorkspace]);

  useEffect(() => {
    if (!selectedConversation) return;
    setLoadingMessages(true);
    getMessages(selectedConversation.id)
      .then(setMessages)
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoadingMessages(false));
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    const msgs = await getMessages(conv.id);
    setMessages(msgs);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      await sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        senderName: user.displayName || "You",
        body: newMessage.trim(),
      });

      const updated = await getMessages(selectedConversation.id);
      setMessages(updated);
      setNewMessage("");

      // Refresh conversations list
      if (activeWorkspace) {
        const convs = await getConversations(activeWorkspace.id);
        setConversations(convs);
      }
    } catch {
      toast.error("Failed to send message");
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.leadEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title="Messages" description="Communication log and outreach tracking." />
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Communication log and outreach tracking."
      />

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation List */}
        <div className="rounded-lg border bg-card lg:col-span-1">
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

          <div className="overflow-y-auto" style={{ height: "calc(100% - 4rem)" }}>
            {loadingConversations ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8 text-muted-foreground/50" />}
                title="No conversations"
                description="Conversations will appear here when you message leads."
              />
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedConversation?.id === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(conv.leadName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium">{conv.leadName}</p>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {conv.lastMessageAt.toDate().toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="rounded-lg border bg-card lg:col-span-2">
          {selectedConversation ? (
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-b p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(selectedConversation.leadName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedConversation.leadName}</p>
                    <p className="text-xs text-muted-foreground">{selectedConversation.leadEmail}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className={`h-16 ${i % 2 === 0 ? "ml-auto w-3/4" : "mr-auto w-3/4"}`} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {!isOwn && (
                            <p className="mb-1 text-xs font-medium">{msg.senderName}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className={`mt-1 text-xs ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={<Mail className="h-12 w-12 text-muted-foreground/50" />}
                title="Select a conversation"
                description="Choose a conversation from the list to view messages."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
