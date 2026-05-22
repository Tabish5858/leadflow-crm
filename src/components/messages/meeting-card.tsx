"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, ExternalLink, Clock, Users } from "lucide-react";

export interface MeetingCardData {
  meetLink: string;
  calendarEventUrl?: string;
  status: "active" | "ended";
  title?: string;
  attendees?: string;
  createdAt?: string;
}

interface MeetingCardProps {
  data: MeetingCardData;
  isOwn: boolean;
}

export function MeetingCard({ data, isOwn }: MeetingCardProps) {
  const isActive = data.status === "active";

  return (
    <Card className={`overflow-hidden border shadow-sm ${isOwn ? "bg-[#d9fdd3]/30 dark:bg-[#005c4b]/20" : "bg-white/80 dark:bg-[#202c33]/80"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isActive ? "bg-primary/15" : "bg-muted"}`}>
          <Video className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {data.title || "Google Meet"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isActive ? "Meeting in progress" : "Meeting ended"}
          </p>
        </div>
        {isActive && (
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-1">
        {data.attendees && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {data.attendees}
          </span>
        )}
        {data.createdAt && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {data.createdAt}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t px-3 py-2">
        {isActive ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              asChild
            >
              <a href={data.meetLink} target="_blank" rel="noopener noreferrer">
                <Video className="h-3.5 w-3.5" />
                Join Meeting
              </a>
            </Button>
            {data.calendarEventUrl && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
                <a href={data.calendarEventUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Calendar
                </a>
              </Button>
            )}
          </>
        ) : (
          <p className="text-[12px] text-muted-foreground italic px-1">
            This meeting has ended
          </p>
        )}
      </div>
    </Card>
  );
}
