"use client";

import type { ProjectNote } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function smartTruncate(text: string, maxLen = 180): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectNotesProps {
  notes: ProjectNote[];
  /** Map of userId -> displayName */
  memberMap?: Map<string, { displayName: string; photoURL?: string | null }>;
  onCreateNote: (data: { title: string; content: string }) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  /** Show only notes for a specific task */
  taskId?: string;
  /** Compact mode (for Overview sidebar) */
  compact?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectNotes({
  notes,
  memberMap,
  onCreateNote,
  onDeleteNote,
  taskId,
  compact,
  className,
}: ProjectNotesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Reset form on open
  useEffect(() => {
    if (showCreate) {
      setNoteTitle("");
      setNoteContent("");
    }
  }, [showCreate]);

  const filteredNotes = taskId
    ? notes.filter((n) => n.taskId === taskId)
    : notes;

  const handleCreate = async () => {
    if (!noteTitle.trim()) return;
    setSaving(true);
    try {
      await onCreateNote({ title: noteTitle.trim(), content: noteContent.trim() });
      setShowCreate(false);
      toast.success("Note created");
    } catch {
      toast.error("Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await onDeleteNote(noteId);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const maxHeight = compact ? "max-h-[280px] overflow-y-auto" : "";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Notes {filteredNotes.length > 0 && `(${filteredNotes.length})`}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          {compact ? "Add" : "Add Note"}
        </Button>
      </div>

      {/* Note list */}
      <div className={cn("space-y-2", maxHeight)}>
        {filteredNotes.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No notes yet.</p>
            {compact && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const author = note.createdBy ? memberMap?.get(note.createdBy) : null;
            const createdAt = note.createdAt?.toDate
              ? note.createdAt.toDate()
              : new Date(note.createdAt as unknown as string);

            return (
              <div
                key={note.id}
                className="group rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    {note.content && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                        {compact ? smartTruncate(note.content) : note.content}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                  {author && (
                    <span className="inline-flex items-center gap-1">
                      <Avatar className="h-3.5 w-3.5">
                        <AvatarImage src={author.photoURL || undefined} />
                        <AvatarFallback className="text-[6px]">
                          {getInitials(author.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {author.displayName}
                    </span>
                  )}
                  <span>{formatDate(createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to this {taskId ? "task" : "project"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="note-title"
                placeholder="Note title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !noteTitle.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
