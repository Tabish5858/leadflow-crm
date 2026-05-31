"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { getApiAuthHeaders } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ExternalLink, Clock, AlertCircle } from "lucide-react";

interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  location?: string;
  description?: string;
}

export function UpcomingEvents() {
  const { activeWorkspace } = useWorkspace();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;

    (async () => {
      try {
        const headers = await getApiAuthHeaders(activeWorkspace.id);
        const res = await fetch(`/api/calendar/events?maxResults=5`, { headers });
        if (!res.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await res.json();
        setEvents(data.events || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeWorkspace]);

  const formatEventTime = (event: CalendarEvent): string => {
    const start = event.start?.dateTime || event.start?.date;
    if (!start) return "";

    const date = new Date(start);
    const isAllDay = !!event.start?.date && !event.start?.dateTime;

    if (isAllDay) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>Your next calendar events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-24 shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>Connect Google Calendar to see your meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Connect Google Calendar in Settings to view upcoming meetings</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>Your next calendar events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No upcoming meetings</p>
            <p className="text-xs text-muted-foreground">
              Create a follow-up with a scheduled date to add events
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Upcoming Meetings
        </CardTitle>
        <CardDescription>Your next {events.length} calendar event{events.length !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {event.summary || "Untitled Event"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatEventTime(event)}
                </p>
              </div>
              {event.htmlLink && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Google Calendar"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
