"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormData {
  taskName: string;
  description: string;
  assigneeId: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  parentTaskId?: string;
  milestoneId?: string;
}

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  /** Map of userId -> displayName for the assignee selector */
  members?: Array<{ userId: string; displayName: string; photoURL?: string | null }>;
  /** Parent task ID if creating a subtask */
  parentTaskId?: string;
  /** Milestone ID if creating a task under a milestone */
  milestoneId?: string;
  saving?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  members = [],
  parentTaskId,
  milestoneId,
  saving,
}: TaskCreateDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const resetForm = () => {
    setTaskName("");
    setDescription("");
    setAssigneeId("");
    setPriority("");
    setStartDate("");
    setDueDate("");
  };

  const handleSubmit = async () => {
    if (!taskName.trim()) return;
    await onSubmit({
      taskName: taskName.trim(),
      description: description.trim(),
      assigneeId,
      priority,
      startDate: startDate ? new Date(startDate + "T00:00:00") : null,
      dueDate: dueDate ? new Date(dueDate + "T00:00:00") : null,
      parentTaskId,
      milestoneId,
    });
    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{parentTaskId ? "Add Subtask" : "New Task"}</DialogTitle>
          <DialogDescription>
            {parentTaskId
              ? "Add a subtask to this task."
              : "Create a new task for this project."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task-name">
              Task Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-name"
              placeholder="e.g., Design landing page"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Assignee + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority">
                  <SelectValue placeholder="No priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-start-date">Start Date</Label>
              <Input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !taskName.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              parentTaskId ? "Create Subtask" : "Create Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
