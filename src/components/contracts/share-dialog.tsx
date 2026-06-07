"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Search, X, Loader2, Share2 } from "lucide-react";

interface ShareEntry {
  clientId: string;
  clientName: string;
  clientEmail: string;
  sharedAt: Date;
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  existingShares: ShareEntry[];
  onShare: (documentId: string, clientIds: string[]) => Promise<void>;
  onRemoveShare: (documentId: string, clientId: string) => Promise<void>;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

export function ShareDialog({
  open,
  onClose,
  documentId,
  documentName,
  existingShares,
  onShare,
  onRemoveShare,
}: ShareDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Placeholder clients - in production these would be fetched from Firestore
  const [clients] = useState<ClientOption[]>([
    { id: "client-1", name: "Alice Johnson", email: "alice@example.com" },
    { id: "client-2", name: "Bob Smith", email: "bob@example.com" },
    { id: "client-3", name: "Carol Williams", email: "carol@example.com" },
  ]);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedClientIds = existingShares.map((s) => s.clientId);

  const toggleClient = (clientId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleShare = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await onShare(documentId, selectedIds);
      toast.success("Document shared successfully");
      setSelectedIds([]);
      onClose();
    } catch {
      toast.error("Failed to share document");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (clientId: string) => {
    setRemoving(clientId);
    try {
      await onRemoveShare(documentId, clientId);
      toast.success("Access removed");
    } catch {
      toast.error("Failed to remove access");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedIds([]); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{documentName}&rdquo; with specific clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Already shared */}
          {existingShares.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Shared with</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {existingShares.map((share) => (
                  <Badge key={share.clientId} variant="secondary" className="gap-1 pr-1">
                    {share.clientName}
                    <button
                      onClick={() => handleRemove(share.clientId)}
                      className="ml-1 hover:text-destructive"
                      disabled={removing === share.clientId}
                    >
                      {removing === share.clientId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search clients */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Add clients</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Client list */}
          <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-1">
            {filteredClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>
            ) : (
              filteredClients.map((client) => {
                const isShared = sharedClientIds.includes(client.id);
                const isSelected = selectedIds.includes(client.id);

                return (
                  <label
                    key={client.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      isShared
                        ? "bg-muted/50 opacity-60"
                        : isSelected
                        ? "bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || isShared}
                      disabled={isShared}
                      onChange={() => toggleClient(client.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    {isShared && (
                      <Badge variant="outline" className="text-[10px]">Shared</Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleShare} disabled={selectedIds.length === 0 || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Share with {selectedIds.length} client{selectedIds.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
