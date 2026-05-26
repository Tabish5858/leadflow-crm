"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { useLeadStore } from "@/lib/stores/leadStore";
import { useWorkspace } from "@/contexts/workspace-context";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { Lead, PipelineStage } from "@/types";
import { useState } from "react";
import { toast } from "@/lib/toast";

export function KanbanBoard({ onLeadClick }: { onLeadClick?: (leadId: string) => void }) {
  const { activeWorkspace } = useWorkspace();
  const { leads, updateStatus } = useLeadStore();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const stages: PipelineStage[] = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine the target status from the drop target
    let newStatus: string | null = null;

    // Check if dropped on a column
    const overId = over.id as string;
    if (overId.startsWith("column-")) {
      newStatus = overId.replace("column-", "");
    }
    // Check if dropped on a card -- find that card's column
    else {
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        newStatus = targetLead.status;
      }
    }

    if (newStatus && newStatus !== lead.status) {
      updateStatus(leadId, newStatus);
      const stageName = stages.find((s) => s.id === newStatus)?.name;
      toast.success(`Moved ${lead.firstName} ${lead.lastName} to ${stageName}`);
    }
  };

  const handleDragCancel = () => {
    setActiveLead(null);
  };

  // Group leads by status
  const leadsByStatus: Record<string, Lead[]> = {};
  for (const stage of stages) {
    leadsByStatus[stage.id] = leads.filter((l) => l.status === stage.id);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:overflow-x-auto lg:pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStatus[stage.id] || []}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-72 rotate-3 opacity-90" style={{ width: '18rem' }}>
            <KanbanCard lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
