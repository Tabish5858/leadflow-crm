"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

interface BookingMeetingType {
  id: string;
  name: string;
  duration: number;
  description: string;
  videoTool: string;
  availability: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  } | null;
}

interface AvailabilitySlot {
  time: string; // "HH:MM" in meeting type's timezone
  display: string; // Human-readable like "9:00 AM"
  label: string; // With timezone like "9:00 AM EDT"
}

interface BookingPageClientProps {
  token: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}


/**
 * Get the timezone abbreviation (e.g. "EDT", "GMT+5", "PKT")
 * for a given IANA timezone at a specific date.
 * Uses the meeting date so DST transitions are handled correctly.
 */
function getTimezoneAbbr(timezone: string, date?: Date): string {
  try {
    // Use the provided date (meeting date) or fall back to current date
    const targetDate = date || new Date();
    // Use "longOffset" to get explicit GMT offset like "GMT-04:00"
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(targetDate);
    // Extract the GMT offset from format like "05/28/2026, 14:30:00 GMT-04:00"
    const gmtMatch = formatted.match(/GMT[+-]\d{2}:\d{2}/);
    if (gmtMatch) return gmtMatch[0];

    // Fallback: try short name like "EDT"
    const short = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(targetDate);
    const parts = short.split(" ");
    const last = parts[parts.length - 1];
    if (last && last.length <= 5) return last;

    // Final fallback — return the IANA name
    return timezone.split("/").pop() || timezone;
  } catch {
    return timezone;
  }
}

/** Format "HH:MM" → "9:00 AM" */
function formatSlotTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Format "HH:MM" → "9:00 AM GMT-04:00" using the meeting date */
function formatSlotWithTz(time24: string, tz: string, date?: Date): string {
  try {
    return `${formatSlotTime(time24)} ${getTimezoneAbbr(tz, date)}`;
  } catch {
    return formatSlotTime(time24);
  }
}

/** Generate an array of Dates for today + next 30 days that match daysOfWeek */
function generateAvailableDates(daysOfWeek: number[]): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (daysOfWeek.includes(d.getDay())) {
      dates.push(d);
    }
  }
  return dates;
}

/**
 * Compute the timezone offset (in minutes) for a given date + IANA timezone.
 * Positive = timezone is behind UTC (e.g., EDT = +240).
 * Negative = timezone is ahead of UTC (e.g., PKT = -300).
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  // At UTC noon, what time is it in the target timezone?
  const utcNoon = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  );
  const tzStr = utcNoon.toLocaleString("en-CA", {
    timeZone: timezone,
    hour12: false,
  });
  // "2026-05-25, 08:00:00" for EDT (UTC-4)
  const [, tzTime] = tzStr.split(", ");
  const [tzH, tzM] = tzTime.split(":").map(Number);
  const tzMinutes = tzH * 60 + tzM;
  const utcMinutes = 12 * 60; // noon
  return (utcMinutes - tzMinutes) * 60 * 1000;
}

/** Convert a Date + "HH:MM" (in meeting's timezone) to a UTC ISO string */
function dateAndSlotToISO(date: Date, time24: string, timezone: string): string {
  const [h, m] = time24.split(":").map(Number);
  const offsetMs = getTimezoneOffsetMs(date, timezone);
  // Build a UTC timestamp assuming the given time is in the meeting's timezone
  const localTimestamp = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    m,
    0,
    0
  );
  // Convert to UTC: UTC = local + offset
  const utcTimestamp = localTimestamp + offsetMs;
  return new Date(utcTimestamp).toISOString();
}

function generateMonthCalendar(year: number, month: number): Array<Array<number | null>> {
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

export function BookingPageClient({ token }: BookingPageClientProps) {
  // Page state
  const [meetingType, setMeetingType] = useState<BookingMeetingType | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Calendar state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Slots state
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Booking form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<{ date: string; time: string } | null>(null);

  // Track if we've done the initial date selection (prevent overwrite)
  const initialDateSet = useRef(false);

  // ── Fetch meeting type info ─────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/meetings/book/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setPageError(data.error || "Booking not found");
          return;
        }
        const data = await res.json();
        setMeetingType(data.meetingType);
        setWorkspaceName(data.workspaceName);
      } catch {
        setPageError("Failed to load booking page");
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // ── Generate available dates from daysOfWeek ───────────────────
  useEffect(() => {
    if (!meetingType?.availability) return;
    const dates = generateAvailableDates(meetingType.availability.daysOfWeek);
    setAvailableDates(dates);
    // Only set initial date once — don't overwrite user selection
    if (!initialDateSet.current && dates.length > 0) {
      initialDateSet.current = true;
      setSelectedDate(dates[0]);
      setCalendarYear(dates[0].getFullYear());
      setCalendarMonth(dates[0].getMonth());
    }
  }, [meetingType]);

  // ── Fetch slots when date is selected ──────────────────────────
  // Use AbortController to cancel stale requests
  const activeFetchRef = useRef<AbortController | null>(null);

  const fetchSlots = useCallback(async (date: Date) => {
    // Cancel any in-flight fetch
    activeFetchRef.current?.abort();
    const controller = new AbortController();
    activeFetchRef.current = controller;

    // Clear stale slots immediately
    setSlots([]);
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime("");

    // Build date string manually (not via toISOString — timezone-safe)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(
        `/api/meetings/availability?token=${token}&date=${dateStr}`,
        { signal: controller.signal }
      );
      // If this request was aborted, ignore result
      if (controller.signal.aborted) return;

      if (!res.ok) {
        const err = await res.json();
        setSlotsError(err.error || "Failed to load available times");
        return;
      }
      const data = await res.json();
      const tz = data.timezone || meetingType?.availability?.timezone || "UTC";
      setSlots(
        (data.slots || []).map((s: string) => ({
          time: s,
          display: formatSlotTime(s),
          label: formatSlotWithTz(s, tz, date), // Pass date for correct DST abbreviation
        }))
      );
    } catch (err: unknown) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSlotsError("Failed to load available times");
    } finally {
      if (!controller.signal.aborted) {
        setSlotsLoading(false);
      }
    }
  }, [token, meetingType?.availability?.timezone]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
    return () => {
      activeFetchRef.current?.abort();
    };
  }, [selectedDate, fetchSlots]);

  // ── Calendar navigation ────────────────────────────────────────
  const calendarGrid = generateMonthCalendar(calendarYear, calendarMonth);

  const isDateAvailable = (day: number) => {
    return availableDates.some(
      (d) =>
        d.getFullYear() === calendarYear &&
        d.getMonth() === calendarMonth &&
        d.getDate() === day
    );
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === calendarYear &&
      selectedDate.getMonth() === calendarMonth &&
      selectedDate.getDate() === day
    );
  };

  const handleDayClick = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setSelectedTime("");
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // ── Booking submission ─────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !name.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const tz = meetingType?.availability?.timezone || "UTC";
    const startDateTimeISO = dateAndSlotToISO(selectedDate, selectedTime, tz);

    // Verify it's in the future
    if (new Date(startDateTimeISO) <= new Date()) {
      toast.error("This time has already passed");
      return;
    }

    setBooking(true);
    try {
      const res = await fetch(`/api/meetings/book/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startDateTimeISO,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to book meeting");
        return;
      }

      setBooked(true);
      setBookedSlot({
        date: formatDate(selectedDate),
        time: formatSlotWithTz(selectedTime, tz, selectedDate),
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBooking(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────
  const tzLabel = meetingType?.availability?.timezone
    ? `${getTimezoneAbbr(meetingType.availability.timezone, selectedDate || availableDates[0] || new Date())} (${meetingType.availability.timezone})`
    : "";
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth));
  const canSelectMonth =
    calendarYear > new Date().getFullYear() ||
    (calendarYear === new Date().getFullYear() && calendarMonth >= new Date().getMonth());

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // ── Loading screen ────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────
  if (pageError || !meetingType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Booking Not Found</h2>
            <p className="text-sm text-muted-foreground text-center">
              {pageError || "This booking link is invalid or has been deactivated."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────
  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-center">Meeting Booked!</h2>

            {/* Meeting details */}
            <div className="w-full space-y-2 bg-muted/50 rounded-lg p-4 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{bookedSlot?.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{bookedSlot?.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{meetingType.duration} min</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              A calendar invitation has been sent to{" "}
              <strong>{email}</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main booking page ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">
            {workspaceName}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Book a {meetingType.name}
          </h1>
          {meetingType.description && (
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {meetingType.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              {meetingType.duration} min
            </Badge>
            {meetingType.videoTool === "google_meet" && (
              <Badge variant="outline">
                <Video className="mr-1 h-3 w-3" />
                Google Meet
              </Badge>
            )}
            {tzLabel && (
              <Badge variant="outline" className="text-xs">
                {tzLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left: Calendar */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Select a Date &amp; Time</CardTitle>
              </div>
              <CardDescription>
                All times are shown in {tzLabel || "your local timezone"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar grid */}
              <div>
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevMonth}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{monthLabel}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    disabled={!canSelectMonth}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs font-medium text-muted-foreground py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarGrid.flat().map((day, i) => {
                    if (day === null) {
                      return <div key={`empty-${i}`} className="h-10" />;
                    }

                    const available = isDateAvailable(day);
                    const selected = isDateSelected(day);
                    const today = new Date();
                    const isPast =
                      calendarYear < today.getFullYear() ||
                      (calendarYear === today.getFullYear() &&
                        calendarMonth < today.getMonth()) ||
                      (calendarYear === today.getFullYear() &&
                        calendarMonth === today.getMonth() &&
                        day < today.getDate());

                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        disabled={!available || isPast}
                        onClick={() => handleDayClick(day)}
                        className={`h-10 rounded-md text-sm font-medium transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                            : available && !isPast
                            ? "hover:bg-accent cursor-pointer text-foreground"
                            : isPast
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "text-muted-foreground"
                        } ${
                          available && !selected && !isPast
                            ? "bg-accent/50 font-semibold"
                            : ""
                        }`}
                      >
                        {day}
                        {available && !isPast && (
                          <div className="h-1 w-1 rounded-full bg-primary mx-auto mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected date display */}
              {selectedDate && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">
                    {formatDate(selectedDate)}
                  </p>

                  {/* Time slots */}
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : slotsError ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {slotsError}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No available times on this day.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try selecting a different date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={`px-2 py-2.5 rounded-md text-xs font-medium transition-colors ${
                            selectedTime === slot.time
                              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                              : "bg-muted hover:bg-accent text-foreground"
                          }`}
                        >
                          {slot.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Booking form */}
          <div className="md:col-span-2 space-y-4">
            {/* Timezone info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Times shown in{" "}
                    <strong>{tzLabel || "your timezone"}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {selectedTime ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Your Details</CardTitle>
                  <CardDescription>
                    We&apos;ll send the calendar invitation to this email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Selected time summary */}
                  <div className="bg-muted/50 rounded-md p-2.5 text-sm space-y-1 mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedDate ? formatDate(selectedDate) : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {selectedTime && selectedDate
                          ? formatSlotWithTz(selectedTime, meetingType.availability?.timezone || "UTC", selectedDate)
                          : ""}{" "}
                        &middot; {meetingType.duration} min
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="book-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="book-name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="book-email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="book-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="book-notes">Notes (optional)</Label>
                    <Textarea
                      id="book-notes"
                      placeholder="Anything you'd like to discuss..."
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleBook}
                    disabled={booking || !name.trim() || !email.trim()}
                  >
                    {booking ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-1.5 h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a date and time slot to book your meeting.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
