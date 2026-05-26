"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import type { Lead, PipelineStage } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick?: (leadId: string) => void;
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.id}`,
  });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);

  return (
    <div className="flex w-full shrink-0 flex-col rounded-xl bg-card/50 border lg:w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          {/* Status color indicator */}
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Column Total */}
      {totalValue > 0 && (
        <div className="px-4 py-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">
            {formatCurrency(totalValue)}
          </p>
        </div>
      )}

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 p-3 transition-colors",
          isOver && "ring-1 ring-primary/30 rounded-lg"
        )}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onClick={() => onLeadClick?.(lead.id)} />
        ))}

        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed p-6">
            <p className="text-xs text-muted-foreground">Drop leads here</p>
          </div>
        )}
      </div>
    </div>
  );
}
