"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Loader2,
  Search,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import type { WorkspaceMember } from "@/types";

// ─── Types ────────────────────────────────────────────────────────

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  workspaceId: string;
  /** Pre-selected lead (e.g. coming from lead detail page) */
  preselectedLeadId?: string;
  /** Pre-set attendees */
  presetAttendees?: { email: string; name: string }[];
  onMeetingScheduled?: (data: {
    meetingId: string;
    meetLink: string | null;
    title: string;
    startTime: string;
  }) => void;
}

interface MeetingTypeOption {
  id: string;
  name: string;
  duration: number;
  description: string;
  videoTool: "google_meet" | "none";
  slug?: string;
  bookingToken: string;
  availability?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  } | null;
}

type DialogStep = "select-type" | "datetime" | "details" | "submitting" | "success" | "error";

// ─── Helpers ───────────────────────────────────────────────────────

/** Format "HH:MM" → "9:00 AM" */
function formatSlotTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Generate time slots in 30-min increments within a range */
function generateTimeSlots(
  startTime: string,
  endTime: string,
): { time: string; display: string }[] {
  const slots: { time: string; display: string }[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    slots.push({ time, display: formatSlotTime(time) });
  }
  return slots;
}

/** Generate an array of Dates for today + next 30 days */
function generateAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function generateMonthCalendar(year: number, month: number): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let week: (number | null)[] = [];
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Get initials for avatar fallback */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ─────────────────────────────────────────────────────

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  userId,
  workspaceId,
  preselectedLeadId,
  presetAttendees,
  onMeetingScheduled,
}: ScheduleMeetingDialogProps) {
  const [step, setStep] = useState<DialogStep>("select-type");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Step 1: Meeting Types ──────────────────────────────────────
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<MeetingTypeOption | null>(null);

  // ── Step 2: Date & Time ────────────────────────────────────────
  const [useNow, setUseNow] = useState(true);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<{ time: string; display: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  // ── Step 3: Details ────────────────────────────────────────────
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const memberContainerRef = useRef<HTMLDivElement>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);

  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const leadContainerRef = useRef<HTMLDivElement>(null);
  const leadInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");

  // ── Derived ─────────────────────────────────────────────────────
  const selectedMembers = useMemo(
    () => members.filter((m) => selectedMemberIds.includes(m.userId)),
    [members, selectedMemberIds],
  );

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId),
    [leads, selectedLeadId],
  );

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const q = leadSearch.toLowerCase();
    return leads.filter(
      (l) =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q),
    );
  }, [leads, leadSearch]);

  // Calendar derived
  const calendarGrid = generateMonthCalendar(calendarYear, calendarMonth);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth));

  const isDateAvailable = (day: number) =>
    availableDates.some(
      (d) =>
        d.getFullYear() === calendarYear &&
        d.getMonth() === calendarMonth &&
        d.getDate() === day,
    );

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === calendarYear &&
      selectedDate.getMonth() === calendarMonth &&
      selectedDate.getDate() === day
    );
  };

  // ── Effects ─────────────────────────────────────────────────────

  // Close member dropdown on outside click
  useEffect(() => {
    if (!memberDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        memberContainerRef.current &&
        !memberContainerRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [memberDropdownOpen]);

  // Focus member search when opened
  useEffect(() => {
    if (memberDropdownOpen && memberInputRef.current) {
      memberInputRef.current.focus();
    }
  }, [memberDropdownOpen]);

  // Close lead dropdown on outside click
  useEffect(() => {
    if (!leadDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        leadContainerRef.current &&
        !leadContainerRef.current.contains(e.target as Node)
      ) {
        setLeadDropdownOpen(false);
        setLeadSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [leadDropdownOpen]);

  // Focus lead search when opened
  useEffect(() => {
    if (leadDropdownOpen && leadInputRef.current) {
      leadInputRef.current.focus();
    }
  }, [leadDropdownOpen]);

  // Generate available dates when meeting type is selected
  useEffect(() => {
    if (!selectedType) return;
    const dates = generateAvailableDates();
    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0]);
      setCalendarYear(dates[0].getFullYear());
      setCalendarMonth(dates[0].getMonth());
    }
  }, [selectedType]);

  // Generate time slots when date changes
  useEffect(() => {
    if (!selectedDate || useNow || !selectedType) return;
    setSlotsLoading(true);
    setSelectedTime("");

    // Generate slots based on meeting type availability or default 9-5
    const avail = selectedType.availability;
    const start = avail?.startTime || "09:00";
    const end = avail?.endTime || "17:00";
    const generatedSlots = generateTimeSlots(start, end);
    setSlots(generatedSlots);
    setSlotsLoading(false);
  }, [selectedDate, useNow, selectedType]);

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep("select-type");
    setErrorMessage("");
    setSelectedType(null);
    setUseNow(true);
    setSelectedDate(null);
    setSelectedTime("");
    setSlots([]);
    setSelectedMemberIds([]);
    setMemberSearch("");
    setSelectedLeadId(preselectedLeadId || "");
    setLeadSearch("");
    setDescription("");

    // Fetch meeting types
    (async () => {
      setTypesLoading(true);
      try {
        const { getMeetingTypes } = await import("@/lib/firebase/meeting-types");
        const types = await getMeetingTypes(workspaceId);
        setMeetingTypes(types as MeetingTypeOption[]);
      } catch {
        // Non-critical
      } finally {
        setTypesLoading(false);
      }
    })();

    // Fetch workspace members
    (async () => {
      setMembersLoading(true);
      try {
        const { getWorkspaceMembers } = await import(
          "@/lib/firebase/workspaces"
        );
        const wsMembers = await getWorkspaceMembers(workspaceId);
        setMembers(
          wsMembers.filter((m: WorkspaceMember) => m.userId !== userId),
        );
      } catch {
        // Non-critical
      } finally {
        setMembersLoading(false);
      }
    })();

    // Fetch leads
    (async () => {
      setLeadsLoading(true);
      try {
        const { getDocs, collection, query, where, orderBy } = await import(
          "firebase/firestore"
        );
        const { db } = await import("@/lib/firebase/client");
        const q = query(
          collection(db, "leads"),
          where("workspaceId", "==", workspaceId),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Lead,
        );
        setLeads(items);
      } catch {
        // Non-critical
      } finally {
        setLeadsLoading(false);
      }
    })();
  }, [open, workspaceId, preselectedLeadId, userId]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleSelectType = (type: MeetingTypeOption) => {
    setSelectedType(type);
    setUseNow(true);
    setStep("datetime");
  };

  const handleBackToTypes = () => {
    setSelectedType(null);
    setStep("select-type");
  };

  const handleContinueToDetails = () => {
    if (!useNow && !selectedTime) {
      toast.error("Please select a time slot");
      return;
    }
    setStep("details");
  };

  const handleBackToDatetime = () => {
    setStep("datetime");
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
    // Don't close the dropdown — multi-select should stay open
  };

  const removeMember = (memberId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    // Compute start time
    let startDateTime: Date;
    if (useNow) {
      startDateTime = new Date();
      startDateTime.setMinutes(startDateTime.getMinutes() + 5);
    } else {
      if (!selectedDate || !selectedTime) {
        toast.error("Please select a date and time");
        return;
      }
      const [h, m] = selectedTime.split(":").map(Number);
      startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);
      if (startDateTime <= new Date()) {
        toast.error("Meeting must be scheduled in the future");
        return;
      }
    }

    if (selectedMemberIds.length === 0 && !preselectedLeadId && !selectedLeadId) {
      toast.error("Please add at least one attendee");
      return;
    }

    setStep("submitting");
    setErrorMessage("");

    try {
      // Build attendees from selected workspace members
      const memberAttendees = selectedMembers.map((m) => ({
        email: m.email,
        name: m.displayName,
      }));

      // Build attendee from selected lead (if not already in members)
      const selectedLeadData = leads.find((l) => l.id === selectedLeadId);

      const allAttendees = [
        ...memberAttendees,
        ...(selectedLeadData &&
        !memberAttendees.some((a) => a.email === selectedLeadData.email)
          ? [
              {
                email: selectedLeadData.email,
                name: `${selectedLeadData.firstName} ${selectedLeadData.lastName}`,
              },
            ]
          : []),
        ...(presetAttendees || []).filter(
          (pa) =>
            !memberAttendees.some((a) => a.email === pa.email) &&
            !(
              selectedLeadData && selectedLeadData.email === pa.email
            ),
        ),
      ].filter((a) => a.email);

      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          title: `${selectedType.name}${allAttendees.length > 0 ? ` — ${allAttendees[0].name || allAttendees[0].email}` : ""}`,
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          durationMinutes: selectedType.duration,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees: allAttendees,
          leadId: selectedLeadId || preselectedLeadId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStep("error");
        setErrorMessage(data.error || "Failed to schedule meeting");
        return;
      }

      setStep("success");
      toast.success("Meeting scheduled!");

      onMeetingScheduled?.({
        meetingId: data.meetingId,
        meetLink: data.meetLink,
        title: `${selectedType.name} — ${allAttendees[0]?.name || allAttendees[0]?.email || ""}`,
        startTime: startDateTime.toISOString(),
      });
    } catch {
      setStep("error");
      setErrorMessage("Something went wrong");
    }
  };

  // ── Calendar navigation ─────────────────────────────────────────
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

  const handleDayClick = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setSelectedTime("");
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ══════════ STEP 1: SELECT TYPE ══════════ */}
        {step === "select-type" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select a Meeting Type
              </DialogTitle>
              <DialogDescription>
                Choose the type of meeting you want to schedule
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 max-h-80 overflow-y-auto space-y-2">
              {typesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : meetingTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No meeting types yet. Create one first.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = "/meetings/types";
                    }}
                  >
                    Go to Meeting Types
                  </Button>
                </div>
              ) : (
                meetingTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleSelectType(type)}
                    className="w-full text-left rounded-lg border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{type.name}</div>
                      <Badge variant="secondary">{type.duration} min</Badge>
                    </div>
                    {type.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {type.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {type.duration} min
                      {type.videoTool === "google_meet" && (
                        <>
                          <span>·</span>
                          <Video className="h-3 w-3" />
                          Google Meet
                        </>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ══════════ STEP 2: DATE & TIME ══════════ */}
        {step === "datetime" && selectedType && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedType.name}
              </DialogTitle>
              <DialogDescription>
                {selectedType.duration} min
                {selectedType.videoTool === "google_meet"
                  ? " · Google Meet"
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Now / Pick Date & Time toggle */}
              <div className="space-y-2">
                <Label>When</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseNow(true);
                      setSelectedTime("");
                    }}
                    className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      useNow
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-foreground"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseNow(false)}
                    className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      !useNow
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-foreground"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
                    Pick Date &amp; Time
                  </button>
                </div>
              </div>

              {/* Calendar view when "Pick Date & Time" is selected */}
              {!useNow && (
                <>
                  {/* Month navigation */}
                  <div className="flex items-center justify-between">
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
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div
                          key={d}
                          className="text-center text-xs font-medium text-muted-foreground py-1"
                        >
                          {d}
                        </div>
                      ),
                    )}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.flat().map((day, i) => {
                      if (day === null) {
                        return (
                          <div key={`empty-${i}`} className="h-9" />
                        );
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
                          className={`h-9 rounded-md text-sm font-medium transition-all ${
                            selected
                              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                              : available && !isPast
                                ? "cursor-pointer text-foreground"
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

                  {/* Time slots */}
                  {selectedDate && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">
                        {formatDate(selectedDate)}
                      </p>

                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

                  {/* Selected time summary */}
                  {selectedTime && selectedDate && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {formatSlotTime(selectedTime)} ·{" "}
                          {selectedType.duration} min
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* "Now" info */}
              {useNow && (
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Meeting will start in about 5 minutes from now.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToTypes}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleContinueToDetails}>
                Continue
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ══════════ STEP 3: DETAILS ══════════ */}
        {step === "details" && selectedType && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedType.name}
              </DialogTitle>
              <DialogDescription>
                {selectedType.duration} min
                {selectedType.videoTool === "google_meet"
                  ? " · Google Meet"
                  : ""}
                {useNow
                  ? " · Starting soon"
                  : selectedTime && selectedDate
                    ? ` · ${formatDate(selectedDate)} at ${formatSlotTime(selectedTime)}`
                    : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Attendees — custom multi-select member dropdown */}
              <div className="space-y-1.5">
                <Label>
                  Attendees <span className="text-destructive">*</span>
                </Label>

                <div ref={memberContainerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "hover:bg-accent/50 transition-colors cursor-pointer",
                      selectedMembers.length === 0 && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {selectedMembers.length === 0
                        ? "Select workspace members..."
                        : `${selectedMembers.length} member${selectedMembers.length !== 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {memberDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {/* Search */}
                      <div className="flex items-center gap-1 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          ref={memberInputRef}
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search members..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto p-1">
                        {membersLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredMembers.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {memberSearch
                              ? "No members found"
                              : "No workspace members"}
                          </div>
                        ) : (
                          filteredMembers.map((member) => {
                            const isSelected = selectedMemberIds.includes(
                              member.userId,
                            );
                            return (
                              <button
                                key={member.userId}
                                type="button"
                                onClick={() => toggleMember(member.userId)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent cursor-pointer",
                                  isSelected && "bg-accent",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input",
                                  )}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3" />
                                  )}
                                </div>
                                <Avatar className="h-7 w-7 shrink-0">
                                  {member.photoURL && (
                                    <AvatarImage
                                      src={member.photoURL}
                                      alt={member.displayName}
                                    />
                                  )}
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(member.displayName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {member.displayName}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {member.email}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected member badges */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedMembers.map((member) => (
                      <Badge
                        key={member.userId}
                        variant="secondary"
                        className="gap-1 pl-1.5"
                      >
                        <Avatar className="h-4 w-4 shrink-0">
                          {member.photoURL && (
                            <AvatarImage
                              src={member.photoURL}
                              alt={member.displayName}
                            />
                          )}
                          <AvatarFallback className="text-[8px]">
                            {getInitials(member.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[120px] truncate">
                          {member.displayName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMember(member.userId)}
                          className="hover:text-destructive shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Lead selector — custom dropdown (CountrySelect pattern) */}
              <div className="space-y-1.5">
                <Label>Linked Lead (optional)</Label>

                <div ref={leadContainerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setLeadDropdownOpen(!leadDropdownOpen)}
                    disabled={leadsLoading}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "hover:bg-accent/50 transition-colors cursor-pointer",
                      !selectedLead && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {selectedLead
                        ? `${selectedLead.firstName} ${selectedLead.lastName}${selectedLead.company ? ` — ${selectedLead.company}` : ""}`
                        : leadsLoading
                          ? "Loading leads..."
                          : "Select a lead..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {leadDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {/* Search */}
                      <div className="flex items-center gap-1 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          ref={leadInputRef}
                          value={leadSearch}
                          onChange={(e) => setLeadSearch(e.target.value)}
                          placeholder="Search leads..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto p-1">
                        {leadsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredLeads.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {leadSearch
                              ? "No leads found"
                              : "No leads available"}
                          </div>
                        ) : (
                          <>
                            {/* "None" option */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadId("");
                                setLeadDropdownOpen(false);
                                setLeadSearch("");
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                                !selectedLeadId && "bg-accent font-medium",
                              )}
                            >
                              <span className="flex-1 text-left text-muted-foreground">
                                None
                              </span>
                              {!selectedLeadId && (
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </button>

                            <div className="border-t my-1" />

                            {filteredLeads.map((lead) => {
                              const isSelected = lead.id === selectedLeadId;
                              return (
                                <button
                                  key={lead.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeadId(lead.id);
                                    setLeadDropdownOpen(false);
                                    setLeadSearch("");
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                                    isSelected && "bg-accent font-medium",
                                  )}
                                >
                                  <span className="flex-1 text-left">
                                    {lead.firstName} {lead.lastName}
                                    {lead.company
                                      ? ` — ${lead.company}`
                                      : ""}
                                  </span>
                                  {isSelected && (
                                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="desc">Notes (optional)</Label>
                <Textarea
                  id="desc"
                  placeholder="Meeting agenda, context, etc."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToDatetime}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  selectedMemberIds.length === 0 &&
                  !selectedLeadId &&
                  !preselectedLeadId
                }
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                Schedule
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ══════════ SUBMITTING ══════════ */}
        {step === "submitting" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="font-medium">Scheduling your meeting...</p>
            <p className="text-sm text-muted-foreground">
              Creating the event and generating meeting link
            </p>
          </div>
        )}

        {/* ══════════ SUCCESS ══════════ */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <p className="font-medium">Meeting Scheduled!</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              The meeting has been created and invitations sent.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}

        {/* ══════════ ERROR ══════════ */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <p className="font-medium">Failed to Schedule</p>
            <p className="text-sm text-destructive text-center max-w-xs">
              {errorMessage}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep("select-type")}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
