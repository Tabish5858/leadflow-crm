"use client";

import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, Users, MoreHorizontal, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Conversation, WorkspaceMember } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Show the OTHER participant's name, with member map fallback. */
function getMemberDisplay(
  conv: Conversation,
  currentUserId: string,
  memberMap: Map<string, string>
): { name: string; detail: string } {
  const ids = conv.participantIds || [];
  const names = conv.participantNames || [];

  // Try index-aligned lookup first
  const otherIdx = ids.findIndex((id) => id !== currentUserId);
  if (otherIdx >= 0 && names[otherIdx]) {
    return { name: names[otherIdx], detail: "Workspace member" };
  }

  // Fallback: look up by userId
  const otherId = ids.find((id) => id !== currentUserId);
  if (otherId && memberMap.has(otherId)) {
    return { name: memberMap.get(otherId)!, detail: "Workspace member" };
  }

  return { name: names[0] || "Team Member", detail: "Workspace member" };
}

function getLeadDisplay(conv: Conversation) {
  return {
    name: conv.leadName || "Unknown",
    detail: conv.leadEmail || "",
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  members: WorkspaceMember[];
  selectedId: string | null;
  currentUserId: string;
  memberMap: Map<string, string>;
  onSelectConversation: (conv: Conversation) => void;
  onSelectMember: (member: WorkspaceMember) => void;
  onDeleteConversation?: (conv: Conversation) => void;
  loading: boolean;
  error: string | null;
}

export function ConversationList({
  conversations,
  members,
  selectedId,
  currentUserId,
  memberMap,
  onSelectConversation,
  onSelectMember,
  onDeleteConversation,
  loading,
  error,
}: ConversationListProps) {
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <MessageSquare className="h-6 w-6 text-destructive" />
        </div>
        <p className="mt-3 text-sm font-medium text-destructive">
          Failed to load conversations
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (conversations.length === 0 && members.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8 text-muted-foreground/50" />}
        title="No conversations"
        description="Start a conversation from a lead or message a team member."
      />
    );
  }

  // ─── List ───────────────────────────────────────────────────────────────

  return (
    <div className="divide-y divide-border/50">
      {/* ── Members Section ─────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div>
          <div className="px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Team Members
            </p>
          </div>
          <div className="space-y-px pb-1">
            {members.map((member) => {
              const isSelected = selectedId === `member_${member.userId}`;
              return (
                <button
                  key={member.userId}
                  onClick={() => onSelectMember(member)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    isSelected ? "bg-muted ring-1 ring-inset ring-primary/10" : ""
                  }`}
                >
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback
                      className={`text-xs ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${isSelected ? "font-semibold" : "font-medium"}`}>
                      {member.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conversations Section ────────────────────────────────────────── */}
      {conversations.length > 0 && (
        <div>
          {members.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conversations
              </p>
            </div>
          )}
          <div className="space-y-px pb-1">
            {conversations.map((conv) => {
              const isLead = conv.type === "lead" || (!conv.type && !!(conv.leadName || conv.leadEmail));
              const { name } = isLead
                ? getLeadDisplay(conv)
                : getMemberDisplay(conv, currentUserId, memberMap);
              const isSelected = selectedId === conv.id;
              const hasUnread = (conv.unreadCount ?? 0) > 0;

              return (
                <div
                  key={conv.id}
                  className={`group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    isSelected ? "bg-muted ring-1 ring-inset ring-primary/10" : ""
                  }`}
                  onMouseEnter={() => setHoveredConvId(conv.id)}
                  onMouseLeave={() => setHoveredConvId(null)}
                >
                  <button
                    onClick={() => onSelectConversation(conv)}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback
                          className={`text-xs ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isLead
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      {!isLead && !isSelected && (
                        <Users className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-amber-500 p-0.5 text-white ring-2 ring-background" />
                      )}
                      {hasUnread && !isSelected && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 truncate">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${hasUnread && !isSelected ? "font-semibold" : "font-medium"}`}
                        >
                          {name}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDate(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-0.5 truncate text-xs w-max ${
                          hasUnread && !isSelected
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </button>

                  {/* Three-dot menu (hover) */}
                  {(hoveredConvId === conv.id || isSelected) && onDeleteConversation && (
                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv);
                            }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
