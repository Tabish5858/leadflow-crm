"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { fetchClientMeetings } from "@/lib/client/client-data";
import { Calendar, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, PageHeader, SkeletonList } from "@/components/client/module-layout";

function ClientMeetingsPage() {
  const { clientWorkspaceId, email } = useClientUser();
  const [allMeetings, setAllMeetings] = useState<
    Awaited<ReturnType<typeof fetchClientMeetings>>
  >([]);
  const [upcoming, setUpcoming] = useState<typeof allMeetings>([]);
  const [past, setPast] = useState<typeof allMeetings>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clientWorkspaceId || !email) return;
    setLoading(true);
    fetchClientMeetings(clientWorkspaceId, email, 100)
      .then((data) => {
        setAllMeetings(data);
        // Split into upcoming/past once
        const now = Date.now();
        const up: typeof data = [];
        const pa: typeof data = [];
        for (const m of data) {
          if (m.startTime.getTime() >= now) up.push(m);
          else pa.push(m);
        }
        setUpcoming(up);
        setPast(pa);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [clientWorkspaceId, email]);

  if (error) {
    return (
      <div>
        <PageHeader title="Meetings" description="Your scheduled meetings" />
        <ErrorState
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        description={
          loading
            ? "Loading..."
            : `${upcoming.length} upcoming, ${past.length} past`
        }
      />

      {loading ? (
        <SkeletonList count={4} height="h-20" />
      ) : allMeetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No meetings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Scheduled meetings will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} currentEmail={email} />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Past Meetings
              </h2>
              <div className="space-y-3">
                {past.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} past currentEmail={email} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  past = false,
  currentEmail,
}: {
  meeting: Awaited<ReturnType<typeof fetchClientMeetings>>[number];
  past?: boolean;
  currentEmail?: string;
}) {
  const isToday =
    meeting.startTime.toDateString() === new Date().toDateString();

  return (
    <Card
      className={`transition-colors ${past ? "opacity-60" : "hover:border-primary/30"}`}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {/* Date column */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-md border bg-muted/30 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {meeting.startTime.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-xl font-bold">
            {meeting.startTime.getDate()}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm">{meeting.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {meeting.startTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                –{" "}
                {meeting.endTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isToday && !past && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px]"
                >
                  Today
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  meeting.status === "completed"
                    ? "bg-green-50 text-green-700"
                    : meeting.status === "cancelled"
                      ? "bg-muted text-muted-foreground"
                      : ""
                }`}
              >
                {meeting.status}
              </Badge>
            </div>
          </div>
          {meeting.attendees.length > 0 && (() => {
            const others = meeting.attendees.filter(
              (a) => a.email?.toLowerCase() !== currentEmail?.toLowerCase()
            );
            if (others.length === 0) return null;
            return (
              <p className="text-xs text-muted-foreground mt-2">
                With:{" "}
                {others.map((a) => a.name || a.email).join(", ")}
              </p>
            );
          })()}
        </div>

        {/* Join button */}
        {meeting.googleMeetLink && !past && (
          <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
            <a
              href={meeting.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video className="h-3.5 w-3.5" />
              Join
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientMeetingsPageWrapper() {
  return (
    <ModuleGuard moduleKey="meetings">
      <ClientMeetingsPage />
    </ModuleGuard>
  );
}
