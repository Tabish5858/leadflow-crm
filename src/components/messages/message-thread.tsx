"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Trash2, X, Check, Smile, Image as ImageIcon, File as FileIcon, Download } from "lucide-react";
import type { Message } from "@/types";
import { MeetingCard } from "@/components/messages/meeting-card";

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error: string | null;
  onEditMessage: (messageId: string, newBody: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageThread({
  messages,
  currentUserId,
  loading,
  error,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingId(msg.id);
    setEditBody(msg.body);
    setHoveredId(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editBody.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      await onEditMessage(editingId, editBody.trim());
      setEditingId(null);
    } catch {
      // handled by parent
    } finally {
      setActionLoading(false);
    }
  }, [editingId, editBody, actionLoading, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditBody("");
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmId || actionLoading) return;
    setActionLoading(true);
    try {
      await onDeleteMessage(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch {
      // handled by parent
    } finally {
      setActionLoading(false);
    }
  }, [deleteConfirmId, actionLoading, onDeleteMessage]);

  // ─── Loading State ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <Skeleton className={`h-14 rounded-2xl ${i % 2 === 0 ? "w-3/5" : "w-3/5"}`} />
          </div>
        ))}
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Trash2 className="h-6 w-6 text-destructive" />
        </div>
        <p className="mt-3 text-sm font-medium text-destructive">Failed to load messages</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-xs space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground">Start the conversation by sending a message below.</p>
        </div>
      </div>
    );
  }

  // ─── Date helpers ───────────────────────────────────────────────────

  const isDifferentDay = (a: Message, b: Message): boolean => {
    if (!a.createdAt || !b.createdAt) return false;
    const da = a.createdAt.toDate();
    const db = b.createdAt.toDate();
    return (
      da.getFullYear() !== db.getFullYear() ||
      da.getMonth() !== db.getMonth() ||
      da.getDate() !== db.getDate()
    );
  };

  const formatDateSeparator = (msg: Message): string => {
    if (!msg.createdAt) return "Just now";
    const d = msg.createdAt.toDate();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  // ─── Messages ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[#efeae2] px-4 py-2 dark:bg-[#0b141a]">
      {messages.map((msg, idx) => {
        const isOwn = msg.senderId === currentUserId;
        const isFirstInGroup = idx === 0 || messages[idx - 1].senderId !== msg.senderId || isDifferentDay(msg, messages[idx - 1]);
        const isLastInGroup = idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId || isDifferentDay(msg, messages[idx + 1]);
        const showDate = idx === 0 || isDifferentDay(msg, messages[idx - 1]);
        const isHovered = hoveredId === msg.id;
        const isEditing = editingId === msg.id;

        return (
          <div key={msg.id}>
            {/* Date separator */}
            {showDate && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm dark:bg-white/10">
                  {formatDateSeparator(msg)}
                </span>
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-1" : "mt-0.5"} ${isLastInGroup ? "mb-1" : "mb-0.5"}`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className={`group relative flex max-w-[72%] ${isOwn ? "flex-row-reverse" : "flex-row"} items-end gap-1`}>
                {/* Message content */}
                <div
                  className={`relative rounded-lg px-3 pb-1.5 pt-2 shadow-sm ${
                    isOwn
                      ? "rounded-br-sm bg-[#d9fdd3] dark:bg-[#005c4b]"
                      : "rounded-bl-sm bg-white dark:bg-[#202c33]"
                  }`}
                >
                  {!isOwn && isFirstInGroup && (
                    <p className="mb-0.5 text-[12px] font-semibold text-[#667781] dark:text-[#8696a0]">
                      {msg.senderName}
                    </p>
                  )}

                  {/* Deleted message */}
                  {msg.deleted ? (
                    <p className="text-sm italic text-muted-foreground">
                      This message was deleted
                    </p>
                  ) : isEditing ? (
                    /* Edit mode */
                    <div className="flex items-center gap-1">
                      <Input
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="h-8 w-56 text-sm border-none bg-white/50 px-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit();
                          }
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSaveEdit}
                        disabled={actionLoading}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    /* Normal message */
                    <>
                      {/* Meeting card */}
                      {msg.meetingCard && (
                        <div className="mb-2 max-w-[280px]">
                          <MeetingCard
                            data={msg.meetingCard}
                            isOwn={isOwn}
                          />
                        </div>
                      )}

                      {/* File attachment */}
                      {msg.attachment && (
                        <div className="mb-2 max-w-[260px]">
                          <a
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border bg-white/60 p-2.5 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            {msg.attachment.type === "image" ? (
                              <ImageIcon className="h-6 w-6 shrink-0 text-blue-500" />
                            ) : (
                              <FileIcon className="h-6 w-6 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-medium text-foreground">
                                {msg.attachment.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(msg.attachment.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        </div>
                      )}

                      {/* Text body */}
                      {msg.body && (
                        <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                          {msg.body}
                        </p>
                      )}

                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] transition-colors ${
                                userIds.includes(currentUserId)
                                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <span className="text-[14px] leading-none">{emoji}</span>
                              {userIds.length > 1 && (
                                <span className="text-[10px]">{userIds.length}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="float-right ml-2 mt-1 inline-flex items-center gap-1 text-[11px] leading-none text-[#667781] dark:text-[#8696a0]">
                        {msg.edited && (
                          <span className="text-[10px] italic">edited</span>
                        )}
                        {msg.createdAt?.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  )}
                </div>

                {/* Hover actions (own messages only) */}
                {isHovered && !isEditing && !msg.deleted && (
                  <div className="absolute -top-4 right-0 z-10 flex items-center rounded-lg bg-white px-1 shadow-md dark:bg-[#202c33]">
                    {/* Reaction picker */}
                    {onToggleReaction && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Add reaction"
                          >
                            <Smile className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1.5" align="start" side="top">
                          <div className="flex gap-0.5">
                            {QUICK_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                className="rounded-md p-1.5 text-lg leading-none transition-transform hover:scale-125 hover:bg-muted"
                                onClick={() => onToggleReaction(msg.id, emoji)}
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {isOwn && (
                      <>
                        <button
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => handleStartEdit(msg)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteConfirmId(msg.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              This message will be removed for everyone. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={actionLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
