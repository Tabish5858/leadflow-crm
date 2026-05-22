"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { AutomationCard, AutomationBuilder } from "@/components/automations/automation-builder";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
} from "@/lib/firebase/automations";
import type { Automation } from "@/types";
import { Plus, Zap } from "lucide-react";
import { toast } from "@/lib/toast";

export default function AutomationsPage() {
  const { activeWorkspace } = useWorkspace();
  const { firebaseUser } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    getAutomations(activeWorkspace.id)
      .then(setAutomations)
      .catch(() => toast.error("Failed to load automations"))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  const handleSave = async (data: Omit<Automation, "id" | "createdAt" | "updatedAt">) => {
    if (!activeWorkspace || !firebaseUser) return;

    try {
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, {
          ...data,
          workspaceId: activeWorkspace.id,
          createdBy: editingAutomation.createdBy,
        });
        toast.success("Automation updated");
      } else {
        await createAutomation({
          ...data,
          workspaceId: activeWorkspace.id,
          createdBy: firebaseUser.uid,
        });
        toast.success("Automation created");
      }

      setAutomations(await getAutomations(activeWorkspace.id));
      setEditingAutomation(null);
    } catch {
      toast.error("Failed to save automation");
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setBuilderOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!activeWorkspace) return;
    try {
      await deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toast.success("Automation deleted");
    } catch {
      toast.error("Failed to delete automation");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!activeWorkspace) return;
    try {
      await toggleAutomation(id, enabled);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled } : a))
      );
      toast.success(enabled ? "Automation enabled" : "Automation disabled");
    } catch {
      toast.error("Failed to toggle automation");
    }
  };

  const handleBuilderClose = (open: boolean) => {
    setBuilderOpen(open);
    if (!open) setEditingAutomation(null);
  };

  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title="Automations" description="Set up follow-up rules and automated actions." />
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Set up follow-up rules and automated actions to save time."
        actions={
          <Button onClick={() => setBuilderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Automation
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-12 w-12 text-muted-foreground/50" />}
          title="No automations yet"
          description="Create your first automation to save time on repetitive tasks."
          actionLabel="Create Automation"
          onAction={() => setBuilderOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <AutomationBuilder
        automation={editingAutomation}
        onSave={handleSave}
        open={builderOpen}
        onOpenChange={handleBuilderClose}
      />
    </div>
  );
}
