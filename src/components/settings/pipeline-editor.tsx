"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GripVertical, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import type { PipelineStage } from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableStageProps {
  stage: PipelineStage;
  index: number;
  onEdit: (stage: PipelineStage) => void;
  onDelete: (stageId: string) => void;
  leadCount: number;
}

function SortableStage({ stage, index, onEdit, onDelete, leadCount }: SortableStageProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: stage.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div
        className="h-4 w-4 shrink-0 rounded-full border"
        style={{ backgroundColor: stage.color }}
      />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{stage.name}</p>
          <Badge variant="secondary" className="text-xs">
            {stage.probability}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {leadCount} lead{leadCount !== 1 ? "s" : ""} in this stage
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(stage)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(stage.id)}
          disabled={leadCount > 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface PipelineEditorProps {
  stages: PipelineStage[];
  leadCounts: Record<string, number>;
  onSave: (stages: PipelineStage[]) => void;
}

export function PipelineEditor({ stages, leadCounts, onSave }: PipelineEditorProps) {
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newStage, setNewStage] = useState<Omit<PipelineStage, "id" | "order">>({
    name: "",
    color: "#3b82f6",
    probability: 0,
    wipLimit: undefined,
  });

  // Sync localStages when stages prop changes (e.g., after save)
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((stage, index) => ({ ...stage, order: index }));
      });
    }
  };

  const handleSave = () => {
    onSave(localStages);
    toast.success("Pipeline stages updated");
  };

  const handleReset = () => {
    setLocalStages(stages);
    toast.info("Changes discarded");
  };

  const handleEdit = (stage: PipelineStage) => {
    setEditingStage({ ...stage });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingStage) return;
    if (!editingStage.name.trim()) {
      toast.error("Stage name is required");
      return;
    }
    setLocalStages((prev) =>
      prev.map((s) => (s.id === editingStage.id ? editingStage : s))
    );
    setEditDialogOpen(false);
    setEditingStage(null);
  };

  const handleDelete = (stageId: string) => {
    const count = leadCounts[stageId] || 0;
    if (count > 0) {
      toast.error(`Cannot delete stage with ${count} lead(s). Move them first.`);
      return;
    }
    setLocalStages((prev) => {
      const filtered = prev.filter((s) => s.id !== stageId);
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
    toast.success("Stage deleted");
  };

  const handleAdd = () => {
    if (!newStage.name.trim()) {
      toast.error("Stage name is required");
      return;
    }
    const id = newStage.name.toLowerCase().replace(/\s+/g, "_");
    if (localStages.find((s) => s.id === id)) {
      toast.error("A stage with this name already exists");
      return;
    }
    setLocalStages((prev) => [
      ...prev,
      { ...newStage, id, order: prev.length },
    ]);
    setNewStage({ name: "", color: "#3b82f6", probability: 0, wipLimit: undefined });
    setAddDialogOpen(false);
    toast.success("Stage added");
  };

  const hasChanges = JSON.stringify(localStages) !== JSON.stringify(stages);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Drag and drop to reorder. Edit or delete stages as needed.
            Stages with leads cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localStages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {localStages.map((stage, index) => (
                <SortableStage
                  key={stage.id}
                  stage={stage}
                  index={index}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  leadCount={leadCounts[stage.id] || 0}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <X className="mr-2 h-4 w-4" />
              Discard
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Add Stage Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pipeline Stage</DialogTitle>
            <DialogDescription>
              Create a new stage for your sales pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input
                placeholder="e.g., Discovery Call"
                value={newStage.name}
                onChange={(e) =>
                  setNewStage({ ...newStage, name: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  className="w-16 p-1 h-10"
                />
                <Input
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Probability: {newStage.probability}%</Label>
              <Slider
                value={[newStage.probability]}
                onValueChange={([v]) =>
                  setNewStage({ ...newStage, probability: v })
                }
                max={100}
                step={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>
              Update the stage details.
            </DialogDescription>
          </DialogHeader>
          {editingStage && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Stage Name</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) =>
                    setEditingStage({ ...editingStage, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={editingStage.color}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, color: e.target.value })
                    }
                    className="w-16 p-1 h-10"
                  />
                  <Input
                    value={editingStage.color}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Probability: {editingStage.probability}%</Label>
                <Slider
                  value={[editingStage.probability]}
                  onValueChange={([v]) =>
                    setEditingStage({ ...editingStage, probability: v })
                  }
                  max={100}
                  step={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
