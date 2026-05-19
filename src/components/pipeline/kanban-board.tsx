"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useLeadStore } from "@/lib/stores/leadStore";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { Lead } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function KanbanBoard() {
  const { leads, updateStatus } = useLeadStore();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

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
    // Check if dropped on a card — find that card's column
    else {
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        newStatus = targetLead.status;
      }
    }

    if (newStatus && newStatus !== lead.status) {
      updateStatus(leadId, newStatus);
      const stageName = DEFAULT_PIPELINE_STAGES.find((s) => s.id === newStatus)?.name;
      toast.success(`Moved ${lead.firstName} ${lead.lastName} to ${stageName}`);
    }
  };

  const handleDragCancel = () => {
    setActiveLead(null);
  };

  // Group leads by status
  const leadsByStatus: Record<string, Lead[]> = {};
  for (const stage of DEFAULT_PIPELINE_STAGES) {
    leadsByStatus[stage.id] = leads.filter((l) => l.status === stage.id);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        <SortableContext
          items={DEFAULT_PIPELINE_STAGES.map((s) => `column-${s.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {DEFAULT_PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStatus[stage.id] || []}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-72 rotate-3 opacity-90">
            <KanbanCard lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
