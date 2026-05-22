"use client";

import { useState } from "react";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  Play,
  ArrowRight,
  Mail,
  Tag,
  User,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "@/lib/toast";
import type { Automation } from "@/types";

const TRIGGER_TYPES = [
  { value: "lead_created", label: "Lead Created", icon: Plus },
  { value: "status_changed", label: "Status Changed", icon: ArrowRight },
  { value: "no_contact_days", label: "No Contact (days)", icon: Clock },
  { value: "field_changed", label: "Field Changed", icon: Pencil },
  { value: "tag_added", label: "Tag Added", icon: Tag },
] as const;

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification", icon: FileText },
  { value: "add_tag", label: "Add Tag", icon: Tag },
  { value: "remove_tag", label: "Remove Tag", icon: Tag },
  { value: "change_status", label: "Change Status", icon: ArrowRight },
  { value: "assign", label: "Assign to User", icon: User },
  { value: "send_email", label: "Send Email", icon: Mail },
] as const;

interface AutomationBuilderProps {
  automation?: Automation | null;
  onSave: (automation: Omit<Automation, "id" | "createdAt" | "updatedAt">) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutomationBuilder({ automation, onSave, open, onOpenChange }: AutomationBuilderProps) {
  const [name, setName] = useState(automation?.name || "");
  const [description, setDescription] = useState(automation?.description || "");
  const [enabled, setEnabled] = useState(automation?.enabled ?? true);
  const [triggerType, setTriggerType] = useState(automation?.trigger.type || "lead_created");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    automation?.trigger.config || {}
  );
  const [actions, setActions] = useState<Automation["actions"]>(automation?.actions || []);
  const [newActionType, setNewActionType] = useState("");

  const handleAddAction = () => {
    if (!newActionType) return;
    setActions([...actions, { type: newActionType as Automation["actions"][number]["type"], config: {} }]);
    setNewActionType("");
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionConfigChange = (index: number, key: string, value: unknown) => {
    setActions(actions.map((action, i) =>
      i === index ? { ...action, config: { ...action.config, [key]: value } } : action
    ));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Automation name is required");
      return;
    }
    if (actions.length === 0) {
      toast.error("At least one action is required");
      return;
    }

    onSave({
      workspaceId: "", // Will be set by caller
      name: name.trim(),
      description: description.trim() || null,
      enabled,
      trigger: { type: triggerType, config: triggerConfig },
      actions,
      createdBy: "", // Will be set by caller
    });

    onOpenChange(false);
  };

  const triggerIcon = TRIGGER_TYPES.find((t) => t.value === triggerType)?.icon || Zap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? "Edit Automation" : "Create Automation"}</DialogTitle>
          <DialogDescription>
            Set up a trigger and actions to automate your workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Auto-assign high-value leads" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this automation do?" rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <Separator />

          {/* Trigger */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium">When...</h3>
            </div>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as Automation["trigger"]["type"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select trigger" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {triggerType === "no_contact_days" && (
              <div className="space-y-2">
                <Label>Days without contact</Label>
                <Input
                  type="number"
                  min={1}
                  value={(triggerConfig.days as number) || 7}
                  onChange={(e) => setTriggerConfig({ days: parseInt(e.target.value) })}
                />
              </div>
            )}

            {triggerType === "status_changed" && (
              <div className="space-y-2">
                <Label>From status (optional)</Label>
                <Input
                  value={(triggerConfig.fromStatus as string) || ""}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, fromStatus: e.target.value })}
                  placeholder="Leave empty for any status change"
                />
              </div>
            )}

            {triggerType === "tag_added" && (
              <div className="space-y-2">
                <Label>Tag name</Label>
                <Input
                  value={(triggerConfig.tag as string) || ""}
                  onChange={(e) => setTriggerConfig({ tag: e.target.value })}
                  placeholder="e.g., urgent"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-medium">Then...</h3>
              </div>
            </div>

            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions added yet.</p>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => {
                  const actionInfo = ACTION_TYPES.find((a) => a.value === action.type);
                  const ActionIcon = actionInfo?.icon || Play;

                  return (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ActionIcon className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">{actionInfo?.label}</span>
                          </div>
                          <TooltipButton tooltip="Remove action" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveAction(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </TooltipButton>
                        </div>

                        {action.type === "add_tag" || action.type === "remove_tag" ? (
                          <div className="space-y-2">
                            <Label>Tag</Label>
                            <Input
                              value={(action.config.tag as string) || ""}
                              onChange={(e) => handleActionConfigChange(index, "tag", e.target.value)}
                              placeholder="e.g., hot-lead"
                            />
                          </div>
                        ) : action.type === "change_status" ? (
                          <div className="space-y-2">
                            <Label>New status</Label>
                            <Input
                              value={(action.config.status as string) || ""}
                              onChange={(e) => handleActionConfigChange(index, "status", e.target.value)}
                              placeholder="e.g., contacted"
                            />
                          </div>
                        ) : action.type === "send_notification" ? (
                          <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                              value={(action.config.message as string) || ""}
                              onChange={(e) => handleActionConfigChange(index, "message", e.target.value)}
                              placeholder="Notification message..."
                              rows={2}
                            />
                          </div>
                        ) : action.type === "send_email" ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Subject</Label>
                              <Input
                                value={(action.config.subject as string) || ""}
                                onChange={(e) => handleActionConfigChange(index, "subject", e.target.value)}
                                placeholder="Email subject"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Body</Label>
                              <Textarea
                                value={(action.config.body as string) || ""}
                                onChange={(e) => handleActionConfigChange(index, "body", e.target.value)}
                                placeholder="Email body..."
                                rows={3}
                              />
                            </div>
                          </div>
                        ) : action.type === "assign" ? (
                          <div className="space-y-2">
                            <Label>User ID</Label>
                            <Input
                              value={(action.config.userId as string) || ""}
                              onChange={(e) => handleActionConfigChange(index, "userId", e.target.value)}
                              placeholder="User ID to assign to"
                            />
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Select value={newActionType} onValueChange={setNewActionType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add action..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      <div className="flex items-center gap-2">
                        <a.icon className="h-4 w-4" />
                        {a.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TooltipButton tooltip="Add action" onClick={handleAddAction} disabled={!newActionType}>
                <Plus className="h-4 w-4" />
              </TooltipButton>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{automation ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AutomationCardProps {
  automation: Automation;
  onEdit: (automation: Automation) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function AutomationCard({ automation, onEdit, onDelete, onToggle }: AutomationCardProps) {
  const triggerInfo = TRIGGER_TYPES.find((t) => t.value === automation.trigger.type);
  const TriggerIcon = triggerInfo?.icon || Zap;

  return (
    <Card className={automation.enabled ? "" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TriggerIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">{automation.name}</CardTitle>
              {automation.description && (
                <CardDescription className="mt-1">{automation.description}</CardDescription>
              )}
            </div>
          </div>
          <Switch checked={automation.enabled} onCheckedChange={(v) => onToggle(automation.id, v)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            <TriggerIcon className="h-3 w-3" />
            {triggerInfo?.label}
          </Badge>
          <span className="text-muted-foreground">→</span>
          {automation.actions.map((action, i) => {
            const actionInfo = ACTION_TYPES.find((a) => a.value === action.type);
            const ActionIcon = actionInfo?.icon || Play;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">+</span>}
                <Badge variant="outline" className="gap-1">
                  <ActionIcon className="h-3 w-3" />
                  {actionInfo?.label}
                </Badge>
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {automation.actions.length} action{automation.actions.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <TooltipButton tooltip="Edit automation" variant="ghost" className="h-7 w-7" onClick={() => onEdit(automation)}>
              <Pencil className="h-3.5 w-3.5" />
            </TooltipButton>
            <TooltipButton tooltip="Delete automation" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(automation.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </TooltipButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
