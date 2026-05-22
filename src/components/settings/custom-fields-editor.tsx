"use client";

import { useState } from "react";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text, Hash, Calendar, List, Tags, Link2, Mail, GripVertical, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "@/lib/toast";
import type { CustomField } from "@/types";
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

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Text },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "select", label: "Select", icon: List },
  { value: "multiselect", label: "Multi-select", icon: Tags },
  { value: "url", label: "URL", icon: Link2 },
  { value: "email", label: "Email", icon: Mail },
] as const;

function SortableField({
  field,
  onEdit,
  onDelete,
}: {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const typeInfo = FIELD_TYPES.find((t) => t.value === field.type);
  const Icon = typeInfo?.icon || Text;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{field.name}</p>
          <Badge variant="secondary" className="text-xs capitalize">{field.type}</Badge>
          {field.required && <Badge className="text-xs">Required</Badge>}
        </div>
        {field.options && field.options.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Options: {field.options.join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <TooltipButton tooltip="Edit field" variant="ghost" className="h-8 w-8" onClick={() => onEdit(field)}>
          <Pencil className="h-3.5 w-3.5" />
        </TooltipButton>
        <TooltipButton tooltip="Delete field" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(field.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </TooltipButton>
      </div>
    </div>
  );
}

interface CustomFieldsEditorProps {
  fields: CustomField[];
  onSave: (fields: CustomField[]) => void;
}

export function CustomFieldsEditor({ fields, onSave }: CustomFieldsEditorProps) {
  const [localFields, setLocalFields] = useState<CustomField[]>(fields);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<CustomField["type"]>("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((f, i) => ({ ...f, order: i }));
      });
    }
  };

  const openAddDialog = () => {
    setEditingField(null);
    setFieldName("");
    setFieldType("text");
    setFieldRequired(false);
    setFieldOptions("");
    setDialogOpen(true);
  };

  const openEditDialog = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.name);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldOptions(field.options?.join(", ") || "");
    setDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldName.trim()) {
      toast.error("Field name is required");
      return;
    }

    const options = ["select", "multiselect"].includes(fieldType)
      ? fieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;

    if (["select", "multiselect"].includes(fieldType) && (!options || options.length === 0)) {
      toast.error("Select fields require at least one option");
      return;
    }

    if (editingField) {
      setLocalFields((prev) =>
        prev.map((f) =>
          f.id === editingField.id
            ? { ...f, name: fieldName.trim(), type: fieldType, required: fieldRequired, options }
            : f
        )
      );
    } else {
      const id = `cf_${Date.now()}`;
      setLocalFields((prev) => [
        ...prev,
        { id, name: fieldName.trim(), type: fieldType, required: fieldRequired, options, order: prev.length },
      ]);
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setLocalFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })));
  };

  const handleSave = () => {
    onSave(localFields);
    toast.success("Custom fields updated");
  };

  const hasChanges = JSON.stringify(localFields) !== JSON.stringify(fields);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
          <CardDescription>
            Add custom fields to capture additional information on leads.
            Drag to reorder fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {localFields.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No custom fields yet.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {localFields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
        {hasChanges && (
          <Button onClick={handleSave}>Save Changes</Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Custom Field"}</DialogTitle>
            <DialogDescription>
              {editingField ? "Update the field details." : "Create a new custom field for leads."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g., Industry" />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomField["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["select", "multiselect"].includes(fieldType) && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-required"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="field-required" className="text-sm">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveField}>{editingField ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
