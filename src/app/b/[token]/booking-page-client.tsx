"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BookingInfoPanel } from "@/components/booking/BookingInfoPanel";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { BookingTimeSlots } from "@/components/booking/BookingTimeSlots";
import { BookingForm } from "@/components/booking/BookingForm";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { BookingStepIndicator } from "@/components/booking/BookingStepIndicator";
import type { BookingStep } from "@/components/booking/BookingStepIndicator";
import { BookingSkeleton } from "@/components/booking/BookingSkeleton";
import type { BookingMeetingType, AvailabilitySlot } from "@/components/booking/types";
import {
  generateAvailableDates,
  formatSlotTime,
  formatSlotWithTz,
  dateAndSlotToISO,
} from "@/components/booking/utils";

interface BookingPageClientProps {
  token: string;
  /** Timezone detected server-side (Cloudflare cf-timezone). Used as first choice. */
  detectedTimezone?: string | null;
}

export function BookingPageClient({ token, detectedTimezone }: BookingPageClientProps) {
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

  // Timezone state
  const [displayTimezone, setDisplayTimezone] = useState<string>("UTC");

  // Booking form
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedEmail, setBookedEmail] = useState("");
  const [bookedSlot, setBookedSlot] = useState<AvailabilitySlot | null>(null);

  // Confirmation redirect
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Track if we've done the initial date selection
  const initialDateSet = useRef(false);

  // ── Auto-detect timezone ────────────────────────────────────
  useEffect(() => {
    if (detectedTimezone) {
      // 1. Server-detected (Cloudflare cf-timezone) — handles VPN
      setDisplayTimezone(detectedTimezone);
    } else {
      // 2. OS-level via Intl API
      try {
        const osTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (osTz) setDisplayTimezone(osTz);
      } catch { /* ignore */ }

      // 3. IP-based override via proxy
      fetch("/api/timezone")
        .then((r) => r.json())
        .then((data) => {
          if (data?.timezone) setDisplayTimezone(data.timezone);
        })
        .catch(() => {});
    }
  }, [detectedTimezone]);

  // ── Auto-detect browser theme ────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = (isLight: boolean) => {
      document.documentElement.classList.toggle("light", isLight);
    };
    applyTheme(mq.matches);
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Fetch meeting type ───────────────────────────────────────
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

  // ── Generate available dates ────────────────────────────────
  useEffect(() => {
    if (!meetingType?.availability) return;
    const dates = generateAvailableDates(meetingType.availability.daysOfWeek);
    setAvailableDates(dates);
    if (!initialDateSet.current && dates.length > 0) {
      initialDateSet.current = true;
      setSelectedDate(dates[0]);
      setCalendarYear(dates[0].getFullYear());
      setCalendarMonth(dates[0].getMonth());
    }
  }, [meetingType]);

  // ── Fetch slots for selected date ───────────────────────────
  const slotsFetchRef = useRef<AbortController | null>(null);

  const fetchSlotsForDate = useCallback(async (date: Date, tz: string) => {
    slotsFetchRef.current?.abort();
    const controller = new AbortController();
    slotsFetchRef.current = controller;

    setSlots([]);
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime("");

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(
        `/api/meetings/availability?token=${token}&date=${dateStr}&timezone=${encodeURIComponent(tz)}`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;

      if (!res.ok) {
        const err = await res.json();
        setSlotsError(err.error || "Failed to load available times");
        return;
      }
      const data = await res.json();
      const slotTz = data.timezone || tz;
      setSlots(
        (data.slots || []).map((s: string) => ({
          time: s,
          display: formatSlotTime(s),
          label: formatSlotWithTz(s, slotTz, date),
        }))
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSlotsError("Failed to load available times");
    } finally {
      if (!controller.signal.aborted) setSlotsLoading(false);
    }
  }, [token]);

  // Fetch slots when selected date or timezone changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlotsForDate(selectedDate, displayTimezone);
    }
    return () => {
      slotsFetchRef.current?.abort();
    };
  }, [selectedDate, displayTimezone, fetchSlotsForDate]);

  // ── Month navigation ────────────────────────────────────────
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
  const canSelectNextMonth =
    calendarYear > new Date().getFullYear() ||
    (calendarYear === new Date().getFullYear() && calendarMonth >= new Date().getMonth());

  // ── Day click ───────────────────────────────────────────────
  const handleDayClick = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setSelectedTime("");
  };

  // ── Time slot click ─────────────────────────────────────────
  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
  };

  // ── Timezone change ─────────────────────────────────────────
  const handleTimezoneChange = (tz: string) => {
    setDisplayTimezone(tz);
  };

  // ── Back from form ──────────────────────────────────────────
  const handleBackFromForm = () => setSelectedTime("");

  // ── Booking submission ──────────────────────────────────────
  const handleBook = async (data: {
    name: string; email: string; notes: string;
    questionAnswers: Record<string, string | string[]>;
  }) => {
    if (!selectedDate || !selectedTime || !meetingType) {
      toast.error("Please fill in all required fields");
      return;
    }
    const tz = displayTimezone || meetingType.availability?.timezone || "UTC";
    const startDateTimeISO = dateAndSlotToISO(selectedDate, selectedTime, tz);
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
          name: data.name,
          email: data.email,
          notes: data.notes || undefined,
          questionAnswers: Object.keys(data.questionAnswers).length > 0 ? data.questionAnswers : undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 409) {
          toast.error("This time was just booked. Please choose another time.");
          setSelectedTime("");
          if (selectedDate) fetchSlotsForDate(selectedDate, displayTimezone);
        } else {
          toast.error(errData.error || "Failed to book meeting");
        }
        return;
      }
      if (meetingType.confirmationPage === "redirect" && meetingType.redirectUrl) {
        setRedirectUrl(meetingType.redirectUrl);
        return;
      }
      setBooked(true);
      setBookedEmail(data.email);
      setBookedSlot({
        time: selectedTime,
        display: formatSlotTime(selectedTime),
        label: formatSlotWithTz(selectedTime, tz, selectedDate),
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBooking(false);
    }
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  if (pageLoading) return <BookingSkeleton />;

  if (pageError || !meetingType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md mx-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-sm text-muted-foreground">
            {pageError || "This booking link is invalid or has been deactivated."}
          </p>
        </div>
      </div>
    );
  }

  if (booked && bookedSlot) {
    return (
      <BookingConfirmation
        meetingType={meetingType}
        selectedDate={selectedDate!}
        selectedSlot={bookedSlot}
        email={bookedEmail}
        displayTimezone={displayTimezone}
      />
    );
  }

  if (redirectUrl) {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(redirectUrl, window.location.origin);
        if (url.origin === window.location.origin || redirectUrl.startsWith("/")) {
          window.location.href = url.href;
        } else {
          setBooked(true);
          setBookedEmail("");
          setBookedSlot({
            time: selectedTime,
            display: formatSlotTime(selectedTime),
            label: formatSlotWithTz(selectedTime, displayTimezone || meetingType.availability?.timezone || "UTC", selectedDate!),
          });
          setRedirectUrl(null);
        }
      } catch {
        setBooked(true);
        setBookedEmail("");
        setBookedSlot({
          time: selectedTime,
          display: formatSlotTime(selectedTime),
          label: formatSlotWithTz(selectedTime, displayTimezone || meetingType.availability?.timezone || "UTC", selectedDate!),
        });
        setRedirectUrl(null);
      }
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // ── Main booking page ──────────────────────────────────────
  const hasTimeSelected = !!selectedTime;
  const currentStep: BookingStep = booked && bookedSlot
    ? "confirmed"
    : hasTimeSelected
      ? "details"
      : "select";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-275 mx-auto px-4 py-12 flex min-h-screen flex-col justify-center">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* ═══ LEFT PANEL ═══ */}
            <div className={`
              border-border p-6 md:p-8 bg-muted/20
              ${hasTimeSelected ? "md:w-85 md:min-w-85" : "md:w-70 md:min-w-70"}
              md:border-r
            `}>
              <BookingInfoPanel
                meetingType={meetingType}
                workspaceName={workspaceName}
                selectedDate={hasTimeSelected ? selectedDate : null}
                selectedTime={hasTimeSelected ? selectedTime : null}
                displayTimezone={displayTimezone}
                onTimezoneChange={handleTimezoneChange}
              />
            </div>

            {/* ═══ RIGHT PANEL ═══ */}
            <div className="flex-1 p-6 md:p-8">
              {/* Step indicator */}
              <BookingStepIndicator currentStep={currentStep} />

              {!hasTimeSelected ? (
                <div
                  key="step-select"
                  className="flex flex-col lg:flex-row gap-8 page-enter"
                >
                  <div className="flex-1">
                    <BookingCalendar
                      calendarYear={calendarYear}
                      calendarMonth={calendarMonth}
                      selectedDate={selectedDate}
                      availableDates={availableDates}
                      onPrevMonth={prevMonth}
                      onNextMonth={nextMonth}
                      onDayClick={handleDayClick}
                      canSelectNextMonth={canSelectNextMonth}
                    />
                  </div>

                  {/* Time slots panel */}
                  <div className="lg:w-[240px] lg:min-w-[240px] lg:border-l lg:border-border lg:pl-6">
                    <BookingTimeSlots
                      selectedDate={selectedDate}
                      slots={slots}
                      slotsLoading={slotsLoading}
                      slotsError={slotsError}
                      selectedTime={selectedTime}
                      onSelectTime={handleSelectTime}
                    />
                  </div>
                </div>
              ) : (
                <div
                  key="step-details"
                  className="page-enter"
                >
                  <BookingForm
                    meetingType={meetingType}
                    selectedDate={selectedDate!}
                    selectedSlot={slots.find((s) => s.time === selectedTime)!}
                    onBack={handleBackFromForm}
                    onSubmit={handleBook}
                    booking={booking}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Powered by <strong>LeadFlow</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
