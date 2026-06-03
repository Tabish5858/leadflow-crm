"use client";

import type { ProjectMilestone } from "@/types";
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
import { CalendarIcon, Flag, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | null): string {
  if (!date) return "No date set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  Pending: { label: "Pending", class: "bg-amber-50 text-amber-700 border-amber-200" },
  Completed: { label: "Completed", class: "bg-green-50 text-green-700 border-green-200" },
  Failed: { label: "Failed", class: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MilestoneListProps {
  milestones: ProjectMilestone[];
  onCreate: (data: { milestoneName: string; description: string; dueDate: Date | null }) => Promise<void>;
  onDelete: (milestoneId: string) => Promise<void>;
  saving?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MilestoneList({ milestones, onCreate, onDelete, saving, className }: MilestoneListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (showCreate) {
      setName("");
      setDescription("");
      setDueDate("");
    }
  }, [showCreate]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const parsedDate = dueDate ? new Date(dueDate + "T00:00:00") : null;
    try {
      await onCreate({ milestoneName: name.trim(), description: description.trim(), dueDate: parsedDate });
      setShowCreate(false);
      toast.success("Milestone created");
    } catch {
      toast.error("Failed to create milestone");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Milestone deleted");
    } catch {
      toast.error("Failed to delete milestone");
    } finally {
      setDeletingId(null);
    }
  };

  const sorted = [...milestones].sort((a, b) => {
    const aDate = a.dueDate?.toDate ? a.dueDate.toDate().getTime() : Infinity;
    const bDate = b.dueDate?.toDate ? b.dueDate.toDate().getTime() : Infinity;
    return aDate - bDate;
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Flag className="h-4 w-4 text-muted-foreground" />
          Milestones ({milestones.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Flag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No milestones yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Milestones help you track key project phases and deadlines.
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((milestone) => {
            const isOverdue =
              milestone.status === "Pending" &&
              milestone.dueDate?.toDate &&
              milestone.dueDate.toDate() < new Date();
            const statusCfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.Pending;
            const dueDateValue = milestone.dueDate?.toDate ? milestone.dueDate.toDate() : null;

            return (
              <div
                key={milestone.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{milestone.milestoneName}</p>
                    <Badge variant="outline" className={statusCfg.class}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className={cn("inline-flex items-center gap-1", isOverdue && "text-red-600 font-medium")}>
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(dueDateValue)}
                      {isOverdue && " (overdue)"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(milestone.id)}
                  disabled={deletingId === milestone.id}
                >
                  {deletingId === milestone.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>
              Milestones mark key dates or deliverables in your project timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="milestone-name"
                placeholder="e.g., Design Phase Complete"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-desc">Description</Label>
              <Input
                id="milestone-desc"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-due">Due Date</Label>
              <Input
                id="milestone-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Milestone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
