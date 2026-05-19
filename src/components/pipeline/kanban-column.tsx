"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import type { Lead, PipelineStage } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.id}`,
  });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/30">
      {/* Column Header */}
      <div
        className="flex items-center justify-between rounded-t-lg border-t-4 p-3"
        style={{ borderTopColor: stage.color }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Column Total */}
      {totalValue > 0 && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground">
            {formatCurrency(totalValue)}
          </p>
        </div>
      )}

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 p-2 transition-colors",
          isOver && "bg-muted/50"
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border-2 border-dashed p-4">
            <p className="text-xs text-muted-foreground">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
}
