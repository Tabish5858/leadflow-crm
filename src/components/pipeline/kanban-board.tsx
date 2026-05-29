"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
import { useState, useCallback } from "react";
import { toast } from "@/lib/toast";

export function KanbanBoard({ onLeadClick }: { onLeadClick?: (leadId: string) => void }) {
  const { activeWorkspace, user } = useWorkspace();
  const { leads, updateStatus } = useLeadStore();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [insertState, setInsertState] = useState<{
    columnId: string | null;
    index: number;
  }>({ columnId: null, index: 0 });

  const stages: PipelineStage[] = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, activatorEvent } = event;
    if (!over) {
      setInsertState({ columnId: null, index: 0 });
      return;
    }

    // Determine which column is being hovered
    const overId = over.id as string;
    let columnId: string | null = null;

    if (overId.startsWith("column-")) {
      columnId = overId.replace("column-", "");
    } else {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) columnId = overLead.status;
    }

    if (!columnId) {
      setInsertState({ columnId: null, index: 0 });
      return;
    }

    // Calculate insertion index based on pointer Y versus card midpoints
    const columnEl = document.querySelector(`[data-droppable="column-${columnId}"]`);
    if (!columnEl) {
      setInsertState({ columnId, index: 0 });
      return;
    }

    // Only count actual lead cards (not the drop indicator)
    const cardEls = columnEl.querySelectorAll('[data-draggable="true"]');
    const pointerY = (activatorEvent as PointerEvent).clientY;

    let index = 0;
    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect();
      if (pointerY >= rect.top + rect.height / 2) {
        index = i + 1;
      } else {
        break;
      }
    }

    setInsertState((prev) =>
      prev.columnId === columnId && prev.index === index ? prev : { columnId, index }
    );
  }, [leads]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    setInsertState({ columnId: null, index: 0 });

    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine the target status from the drop target
    let newStatus: string | null = null;

    const overId = over.id as string;
    if (overId.startsWith("column-")) {
      newStatus = overId.replace("column-", "");
    } else {
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        newStatus = targetLead.status;
      }
    }

    if (newStatus && newStatus !== lead.status) {
      updateStatus(leadId, newStatus, user?.id, user?.displayName);
      const stageName = stages.find((s) => s.id === newStatus)?.name;
      toast.success(`Moved ${lead.firstName} ${lead.lastName} to ${stageName}`);
    }
  };

  const handleDragCancel = () => {
    setActiveLead(null);
    setInsertState({ columnId: null, index: 0 });
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
      onDragOver={handleDragOver}
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
            isOver={
              insertState.columnId === stage.id
            }
            insertIndex={
              insertState.columnId === stage.id ? insertState.index : -1
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-72">
            <KanbanCard
              lead={activeLead}
              stageProbability={stages.find((s) => s.name === activeLead.status)?.probability}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
