"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2 } from "lucide-react";
import { getLeadsByWorkspace } from "@/lib/firebase/firestore";
import { getInitials } from "@/lib/utils";
import type { Lead } from "@/types";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreateConversation: (lead: Lead) => Promise<void>;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreateConversation,
}: NewConversationDialogProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workspaceId) return;

    setLoading(true);
    setError(null);

    getLeadsByWorkspace(workspaceId, 100, null)
      .then((result) => setLeads(result.leads))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load leads");
      })
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  const filteredLeads = leads.filter(
    (lead) =>
      `${lead.firstName} ${lead.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (lead: Lead) => {
    setCreatingId(lead.id);
    try {
      await onCreateConversation(lead);
      onOpenChange(false);
    } catch {
      // Error handled by parent via toast
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Select a lead to start a conversation with.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-destructive">
                Failed to load leads
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No leads match your search."
                  : "No leads in this workspace yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-px py-2">
              {filteredLeads.map((lead) => {
                const leadName = `${lead.firstName} ${lead.lastName}`;
                const isCreating = creatingId === lead.id;

                return (
                  <button
                    key={lead.id}
                    onClick={() => handleCreate(lead)}
                    disabled={!!creatingId}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
                  >
                    <Avatar className="h-9 w-9 border shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(leadName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {leadName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.email}
                        {lead.company ? ` · ${lead.company}` : ""}
                      </p>
                    </div>
                    {isCreating && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
