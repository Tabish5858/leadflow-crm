"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { getApiAuthHeaders } from "@/lib/api/client";
import { MeetingTypeDialog } from "@/components/meetings/meeting-type-dialog";
import { ScheduleMeetingDialog } from "@/components/meetings/schedule-meeting-dialog";
import { CalendarTab } from "@/components/meetings/calendar-tab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Meeting } from "@/types";
import type { MeetingType } from "@/lib/firebase/meeting-types";
import { format, isAfter, isBefore } from "date-fns";
import type { Timestamp } from "firebase/firestore";

const BOOKING_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ─── Helpers ───────────────────────────────────────────────────────

function getMeetingStatusInfo(status: Meeting["status"]) {
  switch (status) {
    case "scheduled":
      return { label: "Scheduled", variant: "default" as const };
    case "in_progress":
      return { label: "In Progress", variant: "secondary" as const };
    case "completed":
      return { label: "Completed", variant: "outline" as const };
    case "cancelled":
      return { label: "Cancelled", variant: "destructive" as const };
  }
}

function formatMeetingDate(
  startTime: Timestamp | { toDate: () => Date } | null | undefined,
  meetingTimezone?: string
): string {
  if (!startTime?.toDate) return "";
  const date = startTime.toDate();

  let timeStr: string;
  if (meetingTimezone) {
    // Format in the meeting's timezone using Intl
    try {
      const tzDateStr = date.toLocaleString("en-US", {
        timeZone: meetingTimezone,
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      // Get timezone abbreviation
      const tzShort = date.toLocaleString("en-US", {
        timeZone: meetingTimezone,
        timeZoneName: "short",
      });
      const tzParts = tzShort.split(" ");
      const tzAbbr = tzParts[tzParts.length - 1] || "";
      timeStr = `${tzDateStr} ${tzAbbr}`;
    } catch {
      timeStr = format(date, "MMM d, yyyy · h:mm a");
    }
  } else {
    timeStr = format(date, "MMM d, yyyy · h:mm a");
  }

  // For "today" and "tomorrow" checks, use the meeting's timezone
  if (meetingTimezone) {
    try {
      const now = new Date();
      const nowInTz = now.toLocaleString("en-US", {
        timeZone: meetingTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const meetingInTz = date.toLocaleString("en-US", {
        timeZone: meetingTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (nowInTz === meetingInTz) return `Today, ${timeStr.split(", ").slice(1).join(", ")}`;
      // Tomorrow check
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowInTz = tomorrow.toLocaleString("en-US", {
        timeZone: meetingTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (tomorrowInTz === meetingInTz) return `Tomorrow, ${timeStr.split(", ").slice(1).join(", ")}`;
    } catch {
      // fall through to default format
    }
  }

  return timeStr;
}

function formatDuration(startTime: Timestamp | { toDate: () => Date } | null | undefined, endTime: Timestamp | { toDate: () => Date } | null | undefined): string {
  if (!startTime?.toDate || !endTime?.toDate) return "";
  const diff = (endTime.toDate().getTime() - startTime.toDate().getTime()) / 60000;
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

// ─── Status Badge Color ────────────────────────────────────────────

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    in_progress:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    completed:
      "bg-muted text-muted-foreground",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <Badge
      variant="outline"
      className={`border-0 ${colors[status] || ""}`}
    >
      {getMeetingStatusInfo(status).label}
    </Badge>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { user, activeWorkspace, loading: wsLoading } = useWorkspace();
  const { canAccess } = usePermissions();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [typesLoading, setTypesLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);

    try {
      const [{ getMeetings }, { getMeetingTypes }] = await Promise.all([
        import("@/lib/firebase/meetings"),
        import("@/lib/firebase/meeting-types"),
      ]);
      const [meetingsData, typesData] = await Promise.all([
        getMeetings(activeWorkspace.id),
        getMeetingTypes(activeWorkspace.id),
      ]);
      setMeetings(meetingsData);
      setMeetingTypes(typesData);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setError("Failed to load meetings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelMeeting = async (meetingId: string) => {
    setCancelling(true);
    try {
      const { cancelMeeting } = await import("@/lib/firebase/meetings");
      await cancelMeeting(meetingId);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, status: "cancelled" as const } : m
        )
      );
      toast.success("Meeting cancelled");
    } catch {
      toast.error("Failed to cancel meeting");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleCompleteMeeting = async (meetingId: string) => {
    try {
      const { updateMeetingStatus } = await import("@/lib/firebase/meetings");
      await updateMeetingStatus(meetingId, "completed");
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, status: "completed" as const } : m
        )
      );
      toast.success("Meeting marked as completed");
    } catch {
      toast.error("Failed to update meeting");
    }
  };

  const handleMeetingScheduled = () => {
    loadData();
  };

  const loadTypes = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setTypesLoading(true);
    try {
      const { getMeetingTypes } = await import("@/lib/firebase/meeting-types");
      const data = await getMeetingTypes(activeWorkspace.id);
      setMeetingTypes(data);
    } catch {
      // Non-critical
    } finally {
      setTypesLoading(false);
    }
  }, [activeWorkspace?.id]);

  const handleDeleteType = async (id: string) => {
    setDeleting(id);
    try {
      const authHeaders = await getApiAuthHeaders(activeWorkspace?.id);
      const res = await fetch(`/api/meetings/types/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      setMeetingTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success("Meeting type deleted");
    } catch {
      toast.error("Failed to delete meeting type");
    } finally {
      setDeleting(null);
    }
  };

  const handleEditType = (type: MeetingType) => {
    setEditingType(type);
    setTypeDialogOpen(true);
  };

  const handleTypeDialogClose = (open: boolean) => {
    setTypeDialogOpen(open);
    if (!open) setTimeout(() => setEditingType(null), 100);
  };

  const copyBookingLink = (type: MeetingType) => {
    const url = type.slug
      ? `${BOOKING_BASE_URL}/schedule/${type.slug}`
      : `${BOOKING_BASE_URL}/b/${type.bookingToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied!");
  };

  // ── Filter meetings ─────────────────────────────────────────────
  const now = new Date();
  const upcoming = meetings.filter(
    (m) =>
      m.status === "scheduled" &&
      m.startTime?.toDate?.() &&
      isAfter(m.startTime.toDate(), now)
  );
  const past = meetings.filter(
    (m) =>
      m.status === "completed" ||
      m.status === "cancelled" ||
      (m.startTime?.toDate?.() && isBefore(m.startTime.toDate(), now))
  );
  const inProgress = meetings.filter((m) => m.status === "in_progress");

  // Sort upcoming by startTime ascending
  upcoming.sort((a, b) => {
    if (!a.startTime?.toDate || !b.startTime?.toDate) return 0;
    return a.startTime.toDate().getTime() - b.startTime.toDate().getTime();
  });

  // Sort past by startTime descending
  past.sort((a, b) => {
    if (!a.startTime?.toDate || !b.startTime?.toDate) return 0;
    return b.startTime.toDate().getTime() - a.startTime.toDate().getTime();
  });

  if (wsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canAccess("meetings")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          You don&apos;t have access to meetings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and manage your meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Meetings + Types tabs */}
      {!loading && !error && (
        <Tabs defaultValue={meetings.length > 0 ? "upcoming" : "types"}>
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming
              {upcoming.length + inProgress.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {upcoming.length + inProgress.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">
              Past
              {past.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {past.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="types">
              Types
              {meetingTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {meetingTypes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar">
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {inProgress.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground">
                  In Progress
                </h3>
                {inProgress.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onComplete={handleCompleteMeeting}
                    onCancel={handleCancelMeeting}
                    cancelTarget={cancelTarget}
                    setCancelTarget={setCancelTarget}
                    cancelling={cancelling}
                  />
                ))}
                <div className="h-2" />
              </>
            )}

            {upcoming.length === 0 && inProgress.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-32 gap-2">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No upcoming meetings
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setScheduleOpen(true)}
                  >
                    Schedule one
                  </Button>
                </CardContent>
              </Card>
            )}

            {upcoming.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onComplete={handleCompleteMeeting}
                onCancel={handleCancelMeeting}
                cancelTarget={cancelTarget}
                setCancelTarget={setCancelTarget}
                cancelling={cancelling}
              />
            ))}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-32 gap-2">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No past meetings
                  </p>
                </CardContent>
              </Card>
            ) : (
              past.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onComplete={handleCompleteMeeting}
                  onCancel={handleCancelMeeting}
                  cancelTarget={cancelTarget}
                  setCancelTarget={setCancelTarget}
                  cancelling={cancelling}
                  past
                />
              ))
            )}
          </TabsContent>

          {/* Types tab */}
          <TabsContent value="types" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Templates for recurring meeting types and booking pages
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setEditingType(null); setTypeDialogOpen(true); }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Type
              </Button>
            </div>

            {typesLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                ))}
              </div>
            ) : meetingTypes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">No meeting types yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create templates for recurring meetings like Discovery Calls, Demos, or Follow-ups
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingType(null); setTypeDialogOpen(true); }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Meeting Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {meetingTypes.map((type) => {
                  const bookingUrl = type.slug
                    ? `${BOOKING_BASE_URL}/schedule/${type.slug}`
                    : type.bookingToken
                    ? `${BOOKING_BASE_URL}/b/${type.bookingToken}`
                    : null;

                  return (
                    <Card key={type.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{type.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditType(type)}
                              title="Edit meeting type"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={deleting === type.id}
                              onClick={() => handleDeleteType(type.id)}
                              title="Delete meeting type"
                            >
                              {deleting === type.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{type.duration} min</Badge>
                          <Badge variant="outline">
                            {type.videoTool === "google_meet" ? "Google Meet" : "In-person"}
                          </Badge>
                        </div>
                        {type.availability && (
                          <div className="text-xs text-muted-foreground">
                            {type.availability.daysOfWeek.length === 5
                              ? "Weekdays"
                              : type.availability.daysOfWeek
                                  .map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d])
                                  .join(", ")}{" "}
                            &middot; {type.availability.startTime}-{type.availability.endTime}
                          </div>
                        )}
                        {bookingUrl && (
                          <div className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <Input
                                value={bookingUrl}
                                readOnly
                                className="text-xs font-mono h-8 bg-muted/30"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 shrink-0"
                              onClick={() => copyBookingLink(type)}
                              title="Copy booking link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Calendar tab */}
          <TabsContent value="calendar" className="mt-4">
            <CalendarTab />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      {user && activeWorkspace && (
        <>
          <ScheduleMeetingDialog
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            userId={user.id}
            workspaceId={activeWorkspace.id}
            onMeetingScheduled={handleMeetingScheduled}
          />
          <MeetingTypeDialog
            open={typeDialogOpen}
            onOpenChange={handleTypeDialogClose}
            userId={user.id}
            workspaceId={activeWorkspace.id}
            onSaved={() => { loadData(); loadTypes(); }}
            editingType={editingType}
          />
        </>
      )}
    </div>
  );
}

// ─── Meeting Card Component ────────────────────────────────────────

function MeetingCard({
  meeting,
  onComplete,
  onCancel,
  cancelTarget,
  setCancelTarget,
  cancelling,
  past,
}: {
  meeting: Meeting;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  cancelTarget: string | null;
  setCancelTarget: (id: string | null) => void;
  cancelling: boolean;
  past?: boolean;
}) {
  return (
    <Card className={`${past ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{meeting.title}</h3>
              <StatusBadge status={meeting.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatMeetingDate(meeting.startTime, meeting.timezone)}
              </span>
              <span>{formatDuration(meeting.startTime, meeting.endTime)}</span>
              {meeting.attendees.length > 0 && (
                <span className="text-xs">
                  {meeting.attendees.length} attendee
                  {meeting.attendees.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {meeting.description && (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                {meeting.description}
              </p>
            )}

            {/* Attendees */}
            {meeting.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {meeting.attendees.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {a.name || a.email}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {meeting.googleMeetLink && meeting.status !== "cancelled" && (
              <Button
                variant="default"
                size="sm"
                className="h-8"
                onClick={() => window.open(meeting.googleMeetLink, "_blank")}
              >
                <Video className="h-3.5 w-3.5 mr-1" />
                Join
              </Button>
            )}

            {!past && meeting.status === "scheduled" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {meeting.calendarEventUrl && (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(meeting.calendarEventUrl, "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View in Calendar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onComplete(meeting.id)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Mark Completed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {cancelTarget === meeting.id ? (
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={cancelling}
                      onClick={() => onCancel(meeting.id)}
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Confirm Cancel
                        </>
                      )}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setCancelTarget(meeting.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Meeting
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
