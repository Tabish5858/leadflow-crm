"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { Calendar, ExternalLink, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ClientMeeting {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  googleMeetLink?: string;
  status: string;
}

interface MeetingsWidgetProps {
  workspaceId: string;
  userEmail: string;
}

export function MeetingsWidget({ workspaceId, userEmail }: MeetingsWidgetProps) {
  const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !userEmail) return;

    (async () => {
      try {
        const meetingsRef = collection(db, "meetings");
        const q = query(
          meetingsRef,
          where("workspaceId", "==", workspaceId),
          orderBy("startTime", "asc"),
          limit(20)
        );
        const snap = await getDocs(q);

        const now = new Date();
        const upcoming = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "Untitled Meeting",
              startTime: (data.startTime as Timestamp)?.toDate() ?? new Date(),
              endTime: (data.endTime as Timestamp)?.toDate() ?? new Date(),
              googleMeetLink: data.googleMeetLink || "",
              status: data.status || "scheduled",
              attendees: data.attendees || [],
            };
          })
          .filter(
            (m) =>
              m.status !== "cancelled" &&
              m.startTime >= now &&
              m.attendees.some(
                (a: { email: string }) =>
                  a.email?.toLowerCase() === userEmail.toLowerCase()
              )
          )
          .slice(0, 3);

        setMeetings(upcoming);
      } catch {
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, userEmail]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>Your scheduled meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No upcoming meetings</p>
            <p className="text-xs text-muted-foreground/60">
              Scheduled meetings will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
          {meetings.length > 0 && (
            <Link
              href="/client/meetings"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <CardDescription>
          Your next {Math.min(meetings.length, 3)} meeting{meetings.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Video className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">
                  {meeting.startTime.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {meeting.startTime < new Date(Date.now() + 86400000) && (
                  <Badge
                    variant="outline"
                    className="mt-1 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] px-1.5 py-0"
                  >
                    Today
                  </Badge>
                )}
              </div>
              {meeting.googleMeetLink && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                  <a
                    href={meeting.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Join Google Meet"
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
