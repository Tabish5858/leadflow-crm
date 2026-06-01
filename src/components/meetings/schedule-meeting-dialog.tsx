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
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { BookingTimeSlots } from "@/components/booking/BookingTimeSlots";
import { generateAvailableDates, formatDate } from "@/components/booking/utils";
import type { AvailabilitySlot } from "@/components/booking/types";
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
import type { WorkspaceMember, User } from "@/types";
import { getApiAuthHeaders } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  workspaceId: string;
  /** Pre-selected client */
  preselectedClientId?: string;
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
  preselectedClientId,
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
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("");

  // ── Step 3: Details ────────────────────────────────────────────
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const memberContainerRef = useRef<HTMLDivElement>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || "");
  const [clients, setClients] = useState<User[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const clientContainerRef = useRef<HTMLDivElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

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

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [clients, clientSearch]);

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

  // Close client dropdown on outside click
  useEffect(() => {
    if (!clientDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        clientContainerRef.current &&
        !clientContainerRef.current.contains(e.target as Node)
      ) {
        setClientDropdownOpen(false);
        setClientSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clientDropdownOpen]);

  // Focus client search when opened
  useEffect(() => {
    if (clientDropdownOpen && clientInputRef.current) {
      clientInputRef.current.focus();
    }
  }, [clientDropdownOpen]);

  // Generate available dates when meeting type is selected
  useEffect(() => {
    if (!selectedType) return;
    const daysOfWeek = selectedType.availability?.daysOfWeek;
    const dates = daysOfWeek && daysOfWeek.length > 0
      ? generateAvailableDates(daysOfWeek)
      : Array.from({ length: 31 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d;
        });
    setAvailableDates(dates);
    setSlotsError(null);
    if (dates.length > 0) {
      setSelectedDate(dates[0]);
      setCalendarYear(dates[0].getFullYear());
      setCalendarMonth(dates[0].getMonth());
    }
  }, [selectedType]);

  // Fetch available time slots from API (includes Google Calendar conflict filtering)
  const slotsFetchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedDate || !selectedType) return;

    slotsFetchRef.current?.abort();
    const controller = new AbortController();
    slotsFetchRef.current = controller;

    setSlots([]);
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime("");

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    (async () => {
      try {
        const res = await fetch(
          `/api/meetings/availability?token=${selectedType.bookingToken}&date=${dateStr}&timezone=${encodeURIComponent(tz)}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to load slots" }));
          if (controller.signal.aborted) return;
          setSlotsError(err.error || "Failed to load available times");
          setSlotsLoading(false);
          return;
        }

        const data = await res.json();
        if (controller.signal.aborted) return;

        setSlots(
          (data.slots || []).map((s: string) => ({
            time: s,
            display: (() => {
              const [h, m] = s.split(":").map(Number);
              const period = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
            })(),
            label: (() => {
              const [h, m] = s.split(":").map(Number);
              const period = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
            })(),
          }))
        );
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSlotsError("Failed to load available times");
        setSlots([]);
      } finally {
        if (!controller.signal.aborted) setSlotsLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedDate, selectedType]);

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep("select-type");
    setErrorMessage("");
    setSelectedType(null);
    setSelectedDate(null);
    setSelectedTime("");
    setSlots([]);
    setSlotsError(null);
    setSelectedMemberIds([]);
    setMemberSearch("");
    setSelectedClientId(preselectedClientId || "");
    setClientSearch("");
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

    // Fetch workspace clients (users with workspaceRoles[workspaceId] === "client")
    (async () => {
      setClientsLoading(true);
      try {
        const { getDocs, collection, query, where } = await import(
          "firebase/firestore"
        );
        const { db } = await import("@/lib/firebase/client");
        const q = query(
          collection(db, "users"),
          where(`workspaceRoles.${workspaceId}`, "==", "client"),
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as User)
          .filter((u) => u.id !== userId);
        setClients(items);
      } catch {
        // Non-critical
      } finally {
        setClientsLoading(false);
      }
    })();
  }, [open, workspaceId, preselectedClientId, userId]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleSelectType = (type: MeetingTypeOption) => {
    setSelectedType(type);
    setStep("datetime");
  };

  const handleBackToTypes = () => {
    setSelectedType(null);
    setStep("select-type");
  };

  const handleContinueToDetails = () => {
    if (!selectedTime) {
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

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }
    const [h, m] = selectedTime.split(":").map(Number);
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(h, m, 0, 0);
    if (startDateTime <= new Date()) {
      toast.error("Meeting must be scheduled in the future");
      return;
    }

    if (selectedMemberIds.length === 0 && !preselectedClientId && !selectedClientId) {
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

      // Build attendee from selected client (if not already in members)
      const selectedClientData = clients.find((c) => c.id === selectedClientId);

      const allAttendees = [
        ...memberAttendees,
        ...(selectedClientData &&
        !memberAttendees.some((a) => a.email === selectedClientData.email)
          ? [
              {
                email: selectedClientData.email,
                name: selectedClientData.displayName,
              },
            ]
          : []),
        ...(presetAttendees || []).filter(
          (pa) =>
            !memberAttendees.some((a) => a.email === pa.email) &&
            !(
              selectedClientData && selectedClientData.email === pa.email
            ),
        ),
      ].filter((a) => a.email);

      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getApiAuthHeaders(workspaceId)),
        },
        body: JSON.stringify({
          title: `${selectedType.name}${allAttendees.length > 0 ? ` — ${allAttendees[0].name || allAttendees[0].email}` : ""}`,
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          durationMinutes: selectedType.duration,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees: allAttendees,
          leadId: undefined,
          clientId: selectedClientId || preselectedClientId || undefined,
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

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Step indicator config
  const SCHEDULE_STEPS = [
    { key: "select-type" as const, label: "Type" },
    { key: "datetime" as const, label: "Date & Time" },
    { key: "details" as const, label: "Details" },
    { key: "success" as const, label: "Confirmed" },
  ];

  const currentStepIndex = step === "select-type" ? 0
    : step === "datetime" ? 1
    : step === "details" ? 2
    : 3; // submitting / success / error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${
        step === "datetime" ? "sm:max-w-2xl" : "sm:max-w-lg"
      }`}>
        {/* Step Indicator (hidden on error) */}
        {step !== "error" && (
          <div className="mb-6">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {SCHEDULE_STEPS.map((s, i) => {
                const completed = i < currentStepIndex;
                const active = i === currentStepIndex;

                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                          transition-all duration-300 ease-in-out
                          ${
                            completed
                              ? "bg-foreground text-background"
                              : active
                                ? "bg-foreground text-background ring-4 ring-foreground/20"
                                : "bg-muted text-muted-foreground border border-border"
                          }
                        `}
                      >
                        {completed ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`
                          text-xs mt-2 whitespace-nowrap transition-colors duration-300
                          ${active ? "text-foreground font-medium" : "text-muted-foreground"}
                        `}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Connector line */}
                    {i < SCHEDULE_STEPS.length - 1 && (
                      <div className="flex-1 h-px mx-3 mb-6 relative">
                        <div className="absolute inset-0 bg-muted-foreground/20 transition-all duration-500" />
                        <div
                          className="absolute inset-y-0 left-0 bg-foreground transition-all duration-500"
                          style={{ width: completed ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

            {/* Side-by-side Calendar + Time Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2">
              {/* Left: Calendar */}
              <div className="sm:col-span-2">
                <BookingCalendar
                  calendarYear={calendarYear}
                  calendarMonth={calendarMonth}
                  selectedDate={selectedDate}
                  availableDates={availableDates}
                  onPrevMonth={() => {
                    if (calendarMonth === 0) {
                      setCalendarYear((y) => y - 1);
                      setCalendarMonth(11);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  onNextMonth={() => {
                    if (calendarMonth === 11) {
                      setCalendarYear((y) => y + 1);
                      setCalendarMonth(0);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  onDayClick={(day: number) => {
                    const date = new Date(calendarYear, calendarMonth, day);
                    setSelectedDate(date);
                    setSelectedTime("");
                  }}
                  canSelectNextMonth={true}
                />
              </div>

              {/* Right: Time Slots */}
              <div>
                <BookingTimeSlots
                  selectedDate={selectedDate}
                  slots={slots}
                  slotsLoading={slotsLoading}
                  slotsError={slotsError}
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                />
              </div>
            </div>

            {/* Selected time summary below */}
            {selectedTime && selectedDate && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {(() => {
                      const [h, m] = selectedTime.split(":").map(Number);
                      const period = h >= 12 ? "PM" : "AM";
                      const h12 = h % 12 || 12;
                      return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
                    })()} · {selectedType.duration} min
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToTypes}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleContinueToDetails} disabled={!selectedTime}>
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
                {selectedTime && selectedDate
                  ? ` · ${formatDate(selectedDate)} at ${(() => {
                      const [h, m] = selectedTime.split(":").map(Number);
                      const period = h >= 12 ? "PM" : "AM";
                      const h12 = h % 12 || 12;
                      return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
                    })()}`
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

              {/* Client selector — custom dropdown */}
              <div className="space-y-1.5">
                <Label>Client (optional)</Label>

                <div ref={clientContainerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    disabled={clientsLoading}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "hover:bg-accent/50 transition-colors cursor-pointer",
                      !selectedClient && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {selectedClient
                        ? selectedClient.displayName
                        : clientsLoading
                          ? "Loading clients..."
                          : "Select a client..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {clientDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {/* Search */}
                      <div className="flex items-center gap-1 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          ref={clientInputRef}
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search clients..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* List */}
                      <div className="max-h-48 overflow-y-auto p-1">
                        {clientsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {clientSearch
                              ? "No clients found"
                              : "No clients available"}
                          </div>
                        ) : (
                          <>
                            {/* "None" option */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId("");
                                setClientDropdownOpen(false);
                                setClientSearch("");
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                                !selectedClientId && "bg-accent font-medium",
                              )}
                            >
                              <span className="flex-1 text-left text-muted-foreground">
                                None
                              </span>
                              {!selectedClientId && (
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </button>

                            <div className="border-t my-1" />

                            {filteredClients.map((client) => {
                              const isSelected = client.id === selectedClientId;
                              return (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClientId(client.id);
                                    setClientDropdownOpen(false);
                                    setClientSearch("");
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                                    isSelected && "bg-accent font-medium",
                                  )}
                                >
                                  <Avatar className="h-7 w-7 shrink-0">
                                    {client.photoURL && (
                                      <AvatarImage
                                        src={client.photoURL}
                                        alt={client.displayName}
                                      />
                                    )}
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(client.displayName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {client.displayName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {client.email}
                                    </div>
                                  </div>
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
                  !selectedClientId &&
                  !preselectedClientId
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
