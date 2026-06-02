"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2, Users, X, Plus } from "lucide-react";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import { getInitials } from "@/lib/utils";
import type { Conversation, WorkspaceMember } from "@/types";

interface ManageGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  workspaceId: string;
  currentUserId: string;
  memberMap: Map<string, string>;
  onUpdateMembers: (addedIds: string[], removedIds: string[]) => Promise<void>;
}

export function ManageGroupDialog({
  open,
  onOpenChange,
  conversation,
  workspaceId,
  currentUserId,
  memberMap,
  onUpdateMembers,
}: ManageGroupDialogProps) {
  const [allMembers, setAllMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const participantIds = conversation.participantIds || [];
  const participantNames = conversation.participantNames || [];

  // Track additions/removals since dialog opened
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Effective participant set (initial - removed + added)
  const effectiveIds = new Set(
    participantIds
      .filter((id) => !removedIds.has(id))
      .concat([...addedIds])
  );

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    setError(null);
    setAddedIds(new Set());
    setRemovedIds(new Set());
    setSearchQuery("");

    getWorkspaceMembers(workspaceId)
      .then(setAllMembers)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load members");
      })
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  // Current members (based on initial participantIds - removed)
  const currentMembers = allMembers.filter(
    (m) => participantIds.includes(m.userId) && !removedIds.has(m.userId)
  );

  // Available to add (not in effective set)
  const availableMembers = allMembers.filter(
    (m) => !effectiveIds.has(m.userId) && m.userId !== currentUserId
  );

  const filteredCurrent = searchQuery
    ? currentMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentMembers;

  const filteredAvailable = searchQuery
    ? availableMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableMembers;

  const getMemberName = (userId: string, idx: number): string => {
    if (idx >= 0 && participantNames[idx]) return participantNames[idx];
    return memberMap.get(userId) || allMembers.find((m) => m.userId === userId)?.displayName || "Unknown";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateMembers([...addedIds], [...removedIds]);
      onOpenChange(false);
    } catch {
      // Parent handles error via toast
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = addedIds.size > 0 || removedIds.size > 0;

  const MemberRow = ({
    member,
    action,
  }: {
    member: WorkspaceMember;
    action: "remove" | "add";
  }) => {
    const idx = participantIds.indexOf(member.userId);
    const name = getMemberName(member.userId, idx);

    return (
      <div className="flex items-center gap-3 py-2">
        <Avatar className="h-8 w-8 border shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 shrink-0 ${action === "remove" ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-700"}`}
          onClick={() => {
            if (action === "remove") {
              setRemovedIds((prev) => {
                const next = new Set(prev);
                next.add(member.userId);
                return next;
              });
              setAddedIds((prev) => {
                const next = new Set(prev);
                next.delete(member.userId);
                return next;
              });
            } else {
              setAddedIds((prev) => {
                const next = new Set(prev);
                next.add(member.userId);
                return next;
              });
              setRemovedIds((prev) => {
                const next = new Set(prev);
                next.delete(member.userId);
                return next;
              });
            }
          }}
          disabled={saving}
        >
          {action === "remove" ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {conversation.groupName || "Group"} - Manage Members
          </DialogTitle>
          <DialogDescription>
            Add or remove members from this group conversation.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto -mx-6 px-6 space-y-4">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load members</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              {/* Current members */}
              {filteredCurrent.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                    Members ({currentMembers.length})
                  </p>
                  <div className="space-y-px">
                    {filteredCurrent.map((member) => (
                      <MemberRow key={member.userId} member={member} action="remove" />
                    ))}
                  </div>
                </div>
              )}

              {/* Available to add */}
              {availableMembers.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                    Add Members
                  </p>
                  {filteredAvailable.length === 0 && searchQuery ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No members match your search.
                    </p>
                  ) : (
                    <div className="space-y-px">
                      {filteredAvailable.map((member) => (
                        <MemberRow key={member.userId} member={member} action="add" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentMembers.length === 0 && availableMembers.length === 0 && (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No other members in this workspace.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              `Save Changes${hasChanges ? ` (${addedIds.size + removedIds.size})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
