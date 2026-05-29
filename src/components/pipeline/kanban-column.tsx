"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import type { Lead, PipelineStage } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick?: (leadId: string) => void;
  isOver?: boolean;
  insertIndex?: number;
}

export function KanbanColumn({ stage, leads, onLeadClick, isOver, insertIndex = -1 }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `column-${stage.id}`,
  });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);

  return (
    <div className="flex w-full shrink-0 flex-col rounded-xl bg-card/50 border lg:w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {leads.length}
          </span>
        </div>
        {stage.probability > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {stage.probability}% win rate
          </span>
        )}
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
        data-droppable={`column-${stage.id}`}
        className={cn(
          "flex min-h-[200px] flex-col gap-2 p-3 transition-colors",
          isOver && "bg-muted/10"
        )}
      >
        {leads.map((lead, idx) => (
          <div key={lead.id} className="relative">
            {/* Insertion line before this card */}
            {isOver && insertIndex === idx && (
              <div className="absolute -top-[5px] left-0 right-0 z-10 flex items-center">
                <div className="h-[3px] flex-1 rounded-full bg-primary" />
              </div>
            )}
            <KanbanCard lead={lead} stageProbability={stage.probability} onClick={() => onLeadClick?.(lead.id)} />
          </div>
        ))}

        {/* Insertion line at the bottom of the list */}
        {isOver && insertIndex === leads.length && (
          <div className="flex items-center">
            <div className="h-[3px] flex-1 rounded-full bg-primary" />
          </div>
        )}

        {/* Empty column state */}
        {leads.length === 0 && !isOver && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed p-6">
            <p className="text-xs text-muted-foreground">Drop leads here</p>
          </div>
        )}
      </div>
    </div>
  );
}
