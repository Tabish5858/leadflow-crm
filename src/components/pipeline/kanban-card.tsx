"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Building2, DollarSign } from "lucide-react";

interface KanbanCardProps {
  lead: Lead;
  isDragging?: boolean;
  onClick?: () => void;
}

export function KanbanCard({ lead, isDragging, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDragged,
  } = useDraggable({ id: lead.id });

  // isDragged = true on the original card when being dragged (hide it)
  // isDragging = true when rendered inside DragOverlay (show it at full opacity)
  const style = {
    transform: isDragged ? CSS.Transform.toString(transform) : undefined,
    opacity: isDragged ? 0 : 1,
    transition: "transform 200ms ease",
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      data-draggable="true"
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md hover:border-primary/20 cursor-grab active:cursor-grabbing",
      )}
    >
      {/* Content — click opens detail */}
      <div
        className="space-y-2"
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClick?.(); } }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
              {getInitials(`${lead.firstName} ${lead.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {lead.firstName} {lead.lastName}
            </p>
            {lead.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Value */}
        {lead.value && lead.value > 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold text-success">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.value, lead.currency)}
          </div>
        )}

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 capitalize"
              >
                {tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            ))}
            {lead.tags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{lead.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
