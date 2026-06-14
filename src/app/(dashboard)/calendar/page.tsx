"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/workspace-context";
import type { Meeting } from "@/types";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Users,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-green-500",
  completed: "bg-muted-foreground",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getMonthDays(year: number, month: number): Array<Array<number | null>> {
  const weeks: Array<Array<number | null>> = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let week: Array<number | null> = [];
  for (let d = 0; d < firstDay; d++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

// ── Types ──────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

interface MeetingWithType extends Meeting {
  _type?: string;
}

// ── Main Page ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const { activeWorkspace } = useWorkspace();
  const [meetings, setMeetings] = useState<MeetingWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithType | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Load meetings ──────────────────────────────────────────────
  const loadMeetings = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { getMeetings } = await import("@/lib/firebase/meetings");
      const data = await getMeetings(activeWorkspace.id);
      setMeetings(data as MeetingWithType[]);
    } catch {
      setError("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // ── Navigation ─────────────────────────────────────────────────
  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // ── Get meetings for a specific day ────────────────────────────
  const getMeetingsForDay = useCallback(
    (date: Date): MeetingWithType[] => {
      return meetings.filter((m) => {
        const start = m.startTime?.toDate?.();
        if (!start) return false;
        return isSameDay(start, date);
      });
    },
    [meetings]
  );

  // ── Header label ───────────────────────────────────────────────
  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const weekDates = getWeekDates(currentDate);
      const start = weekDates[0];
      const end = weekDates[6];
      const startLabel = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endLabel = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [currentDate, viewMode]);

  // ── Open meeting detail ────────────────────────────────────────
  const openDetail = (meeting: MeetingWithType) => {
    setSelectedMeeting(meeting);
    setDetailOpen(true);
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={loadMeetings} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[100px] text-center sm:text-sm sm:min-w-[180px]">
            <span className="sm:hidden">{headerLabel.length > 20 ? headerLabel.replace(/ \d{4}$/, '') : headerLabel}</span>
            <span className="hidden sm:inline">{headerLabel}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Views */}
      {viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          meetings={meetings}
          getMeetingsForDay={getMeetingsForDay}
          onMeetingClick={openDetail}
        />
      )}
      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          meetings={meetings}
          getMeetingsForDay={getMeetingsForDay}
          onMeetingClick={openDetail}
        />
      )}
      {viewMode === "day" && (
        <DayView
          currentDate={currentDate}
          meetings={meetings}
          getMeetingsForDay={getMeetingsForDay}
          onMeetingClick={openDetail}
        />
      )}

      {/* Meeting Detail Dialog */}
      <MeetingDetailDialog
        meeting={selectedMeeting}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────

function MonthView({
  currentDate,
  meetings,
  getMeetingsForDay,
  onMeetingClick,
}: {
  currentDate: Date;
  meetings: Meeting[];
  getMeetingsForDay: (date: Date) => Meeting[];
  onMeetingClick: (m: Meeting) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const weeks = getMonthDays(year, month);
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground py-2 border-r last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className="h-16 border-r border-b last:border-r-0 bg-muted/20 sm:h-20 lg:h-28"
                />
              );
            }

            const date = new Date(year, month, day);
            const dayMeetings = getMeetingsForDay(date);
            const isToday = isSameDay(date, today);

            return (
              <div
                key={`day-${day}`}
                className="h-16 border-r border-b last:border-r-0 p-1 overflow-hidden hover:bg-accent/30 transition-colors sm:h-20 lg:h-28"
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayMeetings.slice(0, 3).map((m) => {
                    const start = m.startTime?.toDate?.();
                    return (
                      <button
                        key={m.id}
                        onClick={() => onMeetingClick(m)}
                        className="w-full text-left rounded px-1 py-0.5 text-[10px] font-medium truncate hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor:
                            m.status === "scheduled"
                              ? "hsl(217, 91%, 60%)"
                              : m.status === "in_progress"
                              ? "hsl(142, 71%, 45%)"
                              : m.status === "cancelled"
                              ? "hsl(0, 84%, 60%)"
                              : "hsl(220, 9%, 46%)",
                          color: "white",
                        }}
                      >
                        {start && formatTime(start)} {m.title}
                      </button>
                    );
                  })}
                  {dayMeetings.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayMeetings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Week View ──────────────────────────────────────────────────────

function WeekView({
  currentDate,
  meetings,
  getMeetingsForDay,
  onMeetingClick,
}: {
  currentDate: Date;
  meetings: Meeting[];
  getMeetingsForDay: (date: Date) => Meeting[];
  onMeetingClick: (m: Meeting) => void;
}) {
  const weekDates = getWeekDates(currentDate);
  const today = new Date();
  const hours = getHours();

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-w-[700px]">
          <div className="border-r" />
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={i}
                className={`text-center py-1 sm:py-2 border-r last:border-r-0 ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={`text-sm sm:text-lg font-semibold ${
                    isToday
                      ? "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary text-primary-foreground mx-auto"
                      : ""
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto min-w-[700px]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b px-1 py-2 text-[10px] text-muted-foreground text-right">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? "12 PM"
                  : `${hour - 12} PM`}
              </div>
              {weekDates.map((date, dayIdx) => {
                const dayMeetings = getMeetingsForDay(date).filter((m) => {
                  const start = m.startTime?.toDate?.();
                  return start && start.getHours() === hour;
                });

                return (
                  <div
                    key={`${hour}-${dayIdx}`}
                    className="border-r border-b last:border-r-0 min-h-[40px] p-0.5"
                  >
                    {dayMeetings.map((m) => {
                      const start = m.startTime?.toDate?.();
                      const end = m.endTime?.toDate?.();
                      return (
                        <button
                          key={m.id}
                          onClick={() => onMeetingClick(m)}
                          className="w-full text-left rounded px-1 py-0.5 text-[10px] font-medium truncate hover:opacity-80 transition-opacity mb-0.5"
                          style={{
                            backgroundColor:
                              m.status === "scheduled"
                                ? "hsl(217, 91%, 60%)"
                                : m.status === "in_progress"
                                ? "hsl(142, 71%, 45%)"
                                : m.status === "cancelled"
                                ? "hsl(0, 84%, 60%)"
                                : "hsl(220, 9%, 46%)",
                            color: "white",
                          }}
                          title={`${m.title} (${start ? formatTime(start) : ""} - ${
                            end ? formatTime(end) : ""
                          })`}
                        >
                          <div className="truncate">{m.title}</div>
                          {start && end && (
                            <div className="text-[8px] opacity-80">
                              {formatTime(start)} - {formatTime(end)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Day View ───────────────────────────────────────────────────────

function DayView({
  currentDate,
  meetings,
  getMeetingsForDay,
  onMeetingClick,
}: {
  currentDate: Date;
  meetings: Meeting[];
  getMeetingsForDay: (date: Date) => Meeting[];
  onMeetingClick: (m: Meeting) => void;
}) {
  const hours = getHours();
  const dayMeetings = getMeetingsForDay(currentDate);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[80px_1fr] max-h-[700px] overflow-y-auto">
          {hours.map((hour) => {
            const hourMeetings = dayMeetings.filter((m) => {
              const start = m.startTime?.toDate?.();
              return start && start.getHours() === hour;
            });

            return (
              <div key={hour} className="contents">
                <div className="border-r border-b px-2 py-3 text-xs text-muted-foreground text-right">
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
                </div>
                <div className="border-b min-h-[60px] p-1 relative">
                  {hourMeetings.map((m) => {
                    const start = m.startTime?.toDate?.();
                    const end = m.endTime?.toDate?.();
                    const durationMs = end && start ? end.getTime() - start.getTime() : 0;
                    const durationMins = durationMs / 60000;
                    const heightPx = Math.max(30, (durationMins / 60) * 60);

                    return (
                      <button
                        key={m.id}
                        onClick={() => onMeetingClick(m)}
                        className="w-full text-left rounded-md px-2 py-1 text-xs font-medium hover:opacity-80 transition-opacity mb-1 flex items-center gap-2"
                        style={{
                          backgroundColor:
                            m.status === "scheduled"
                              ? "hsl(217, 91%, 60%)"
                              : m.status === "in_progress"
                              ? "hsl(142, 71%, 45%)"
                              : m.status === "cancelled"
                              ? "hsl(0, 84%, 60%)"
                              : "hsl(220, 9%, 46%)",
                          color: "white",
                          minHeight: `${heightPx}px`,
                        }}
                      >
                        <Video className="h-3 w-3 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{m.title}</div>
                          {start && end && (
                            <div className="text-[10px] opacity-80">
                              {formatTime(start)} - {formatTime(end)} ·{" "}
                              {formatDuration(start, end)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {hourMeetings.length === 0 && isToday && hour === new Date().getHours() && (
                    <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Meeting Detail Dialog ──────────────────────────────────────────

function MeetingDetailDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!meeting) return null;

  const start = meeting.startTime?.toDate?.();
  const end = meeting.endTime?.toDate?.();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[meeting.status]}`}
            />
            {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge
              variant={
                meeting.status === "scheduled"
                  ? "default"
                  : meeting.status === "in_progress"
                  ? "default"
                  : meeting.status === "cancelled"
                  ? "destructive"
                  : "secondary"
              }
            >
              {STATUS_LABELS[meeting.status]}
            </Badge>
            {meeting.meetingType === "instant" && (
              <Badge variant="outline">Instant</Badge>
            )}
          </div>

          {/* Time */}
          {start && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {start.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          {start && end && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(start)} - {formatTime(end)} ·{" "}
                {formatDuration(start, end)}
              </span>
            </div>
          )}

          {/* Attendees */}
          {meeting.attendees?.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {meeting.attendees.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a.name || a.email}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {meeting.description && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              {meeting.description}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {meeting.googleMeetLink && (
              <Button
                size="sm"
                onClick={() => window.open(meeting.googleMeetLink, "_blank")}
              >
                <Video className="h-4 w-4 mr-1.5" />
                Join Meeting
              </Button>
            )}
            {meeting.calendarEventUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(meeting.calendarEventUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View in Calendar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
