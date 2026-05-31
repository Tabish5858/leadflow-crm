"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getApiAuthHeaders } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────

interface BookingQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "dropdown" | "phone" | "date";
  required: boolean;
  options?: string[];
}

interface ReminderConfig {
  id: string;
  title: string;
  who: "client" | "myself" | "team" | "all";
  channel: "email" | "text";
  when: number; // minutes before meeting
  enabled: boolean;
}

interface MeetingTypeData {
  id: string;
  name: string;
  duration: number;
  bufferTime: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minimumNotice?: number;
  dailyLimit?: number;
  videoTool: "google_meet" | "none";
  description: string;
  bookingToken?: string;
  slug?: string;
  availability?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
  bookingQuestions?: BookingQuestion[];
  reminders?: ReminderConfig[];
  confirmationPage?: "default" | "redirect";
  redirectUrl?: string;
}

interface MeetingTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  workspaceId: string;
  onSaved: () => void;
  editingType?: MeetingTypeData | null;
}

// ─── Constants ────────────────────────────────────────────────────

const DURATIONS = [15, 30, 45, 60, 90, 120];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 45, 60];
const BOOKING_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const QUESTION_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Paragraph" },
  { value: "radio", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Component ────────────────────────────────────────────────────

export function MeetingTypeDialog({
  open,
  onOpenChange,
  userId,
  workspaceId,
  onSaved,
  editingType,
}: MeetingTypeDialogProps) {
  const isEditing = !!editingType;
  const [activeTab, setActiveTab] = useState("details");

  // ── State ────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [bufferBefore, setBufferBefore] = useState("0");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [minimumNotice, setMinimumNotice] = useState("0");
  const [dailyLimit, setDailyLimit] = useState("");
  const [videoTool, setVideoTool] = useState<"google_meet" | "none">("google_meet");
  const [description, setDescription] = useState("");
  const [enableBooking, setEnableBooking] = useState(false);
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("17:00");
  const [bookingDays, setBookingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [confirmationPage, setConfirmationPage] = useState<"default" | "redirect">("default");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [bookingQuestions, setBookingQuestions] = useState<BookingQuestion[]>([]);
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);

  // Calendar connection check
  const [calendarConnected, setCalendarConnected] = useState(true); // optimistic default

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const headers = await getApiAuthHeaders(workspaceId);
        const res = await fetch("/api/calendar/status", { headers });
        const data = await res.json();
        setCalendarConnected(data.connected === true);
      } catch {
        setCalendarConnected(false);
      }
    })();
  }, [workspaceId]);

  // Question builder modal state
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BookingQuestion | null>(null);

  // Reminder form modal state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);

  // ── Reset / populate on open ────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    setActiveTab("details");

    if (editingType) {
      setName(editingType.name);
      setDuration(String(editingType.duration));
      setBufferBefore(String(editingType.bufferBefore ?? editingType.bufferTime ?? 0));
      setBufferAfter(String(editingType.bufferAfter ?? editingType.bufferTime ?? 0));
      setMinimumNotice(String(editingType.minimumNotice ?? 0));
      setDailyLimit(editingType.dailyLimit ? String(editingType.dailyLimit) : "");
      setVideoTool(editingType.videoTool);
      setDescription(editingType.description || "");
      setConfirmationPage(editingType.confirmationPage || "default");
      setRedirectUrl(editingType.redirectUrl || "");
      setBookingQuestions(editingType.bookingQuestions || []);
      setReminders(editingType.reminders || []);
      if (editingType.availability) {
        setEnableBooking(true);
        setBookingDays(editingType.availability.daysOfWeek);
        setBookingStart(editingType.availability.startTime);
        setBookingEnd(editingType.availability.endTime);
      } else {
        setEnableBooking(false);
        setBookingDays([1, 2, 3, 4, 5]);
        setBookingStart("09:00");
        setBookingEnd("17:00");
      }
    } else {
      setName("");
      setDuration("30");
      setBufferBefore("0");
      setBufferAfter("0");
      setMinimumNotice("0");
      setDailyLimit("");
      setVideoTool("google_meet");
      setDescription("");
      setEnableBooking(false);
      setBookingStart("09:00");
      setBookingEnd("17:00");
      setBookingDays([1, 2, 3, 4, 5]);
      setConfirmationPage("default");
      setRedirectUrl("");
      setBookingQuestions([]);
      setReminders([]);
    }
  }, [open, editingType]);

  // ── Day toggle ─────────────────────────────────────────────────
  const toggleDay = (day: number) => {
    setBookingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // ── Question handlers ───────────────────────────────────────────
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionEditor(true);
  };

  const handleEditQuestion = (q: BookingQuestion) => {
    setEditingQuestion(q);
    setShowQuestionEditor(true);
  };

  const handleDeleteQuestion = (id: string) => {
    setBookingQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveQuestion = (data: {
    question: string;
    type: BookingQuestion["type"];
    required: boolean;
    options?: string[];
  }) => {
    if (editingQuestion) {
      setBookingQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id ? { ...q, ...data } : q
        )
      );
    } else {
      setBookingQuestions((prev) => [...prev, { id: generateId(), ...data }]);
    }
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  };

  // ── Reminder handlers ───────────────────────────────────────────
  const handleAddReminder = () => {
    setEditingReminder(null);
    setShowReminderForm(true);
  };

  const handleEditReminder = (r: ReminderConfig) => {
    setEditingReminder(r);
    setShowReminderForm(true);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveReminder = (data: Omit<ReminderConfig, "id">) => {
    if (editingReminder) {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === editingReminder.id ? { ...r, ...data } : r
        )
      );
    } else {
      setReminders((prev) => [...prev, { id: generateId(), ...data, enabled: true }]);
    }
    setShowReminderForm(false);
    setEditingReminder(null);
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Meeting type name is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        duration: parseInt(duration, 10),
        bufferBefore: parseInt(bufferBefore, 10),
        bufferAfter: parseInt(bufferAfter, 10),
        bufferTime: Math.max(parseInt(bufferBefore, 10), parseInt(bufferAfter, 10)),
        minimumNotice: parseInt(minimumNotice, 10) || 0,
        dailyLimit: dailyLimit ? parseInt(dailyLimit, 10) : undefined,
        videoTool,
        description: description.trim(),
        availability: enableBooking
          ? {
              daysOfWeek: bookingDays,
              startTime: bookingStart,
              endTime: bookingEnd,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : undefined,
        bookingQuestions: bookingQuestions.length > 0 ? bookingQuestions : undefined,
        reminders: reminders.length > 0 ? reminders : undefined,
        confirmationPage,
        redirectUrl: confirmationPage === "redirect" ? redirectUrl : undefined,
      };

      let res: Response;
      if (isEditing && editingType) {
        res = await fetch(`/api/meetings/types/${editingType.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(await getApiAuthHeaders(workspaceId)),
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/meetings/types", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getApiAuthHeaders(workspaceId)),
          },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save meeting type");
        return;
      }

      toast.success(isEditing ? "Meeting type updated" : "Meeting type created");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────
  // Compute a preview slug from the current name
  const previewSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "meeting";

  const bookingUrl = isEditing && editingType?.slug
    ? `${BOOKING_BASE_URL}/schedule/${editingType.slug}`
    : isEditing && editingType?.bookingToken
    ? `${BOOKING_BASE_URL}/b/${editingType.bookingToken}`
    : enableBooking
    ? `${BOOKING_BASE_URL}/schedule/${previewSlug}`
    : null;

  const hasNameError = !name.trim();

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meeting Type" : "Create Meeting Type"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this meeting type's settings"
              : "Template for recurring meeting types (e.g. Discovery Call, Demo, Follow-up)"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="booking">Booking Page</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>

          {/* ══════════════ TAB 1: DETAILS ═══════════════════════ */}
          <TabsContent value="details" className="space-y-5 pt-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="mt-name">
                Meeting Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mt-name"
                placeholder="e.g. Discovery Call"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={hasNameError ? "border-destructive" : ""}
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <div className="flex gap-3">
                <div className="w-32">
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  minutes
                </div>
              </div>
            </div>

            {/* Meeting Type & Video */}
            <div className="space-y-1.5">
              <Label>Meeting Format</Label>
              <Select
                value={videoTool}
                onValueChange={(v) => setVideoTool(v as "google_meet" | "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_meet">Video (Google Meet)</SelectItem>
                  <SelectItem value="none">In Person</SelectItem>
                </SelectContent>
              </Select>
              {videoTool === "google_meet" && !calendarConnected && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Google Calendar is not connected.{" "}
                    <a
                      href="/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      Connect it in Settings
                    </a>{" "}
                    so Google Meet links are created for bookings.
                  </span>
                </div>
              )}
            </div>

            {/* Buffer Time */}
            <div className="rounded-lg border p-4 space-y-3">
              <Label className="text-sm font-medium">Buffer Time</Label>
              <p className="text-xs text-muted-foreground -mt-2">
                Padding before and after each booked meeting
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Before Meeting</Label>
                  <Select value={bufferBefore} onValueChange={setBufferBefore}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUFFER_OPTIONS.map((b) => (
                        <SelectItem key={b} value={String(b)}>
                          {b === 0 ? "None" : `${b} min`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">After Meeting</Label>
                  <Select value={bufferAfter} onValueChange={setBufferAfter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUFFER_OPTIONS.map((b) => (
                        <SelectItem key={b} value={String(b)}>
                          {b === 0 ? "None" : `${b} min`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="rounded-lg border p-4 space-y-3">
              <Label className="text-sm font-medium">Restrictions</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Minimum Notice</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Must book at least this far ahead
                  </p>
                  <Select value={minimumNotice} onValueChange={setMinimumNotice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                      <SelectItem value="2880">48 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Daily Limit</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Max meetings per day (optional)
                  </p>
                  <Input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="mt-desc">Description (optional)</Label>
              <Textarea
                id="mt-desc"
                placeholder="Describe what this meeting type is for..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Availability Toggle */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Public Booking Page</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow leads to self-schedule using this meeting type
                  </p>
                </div>
                <Switch checked={enableBooking} onCheckedChange={setEnableBooking} />
              </div>

              {enableBooking && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label className="text-xs font-medium">Available Days</Label>
                    <div className="flex gap-1.5 mt-1.5">
                      {DAY_LABELS.map((label, day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`h-8 w-10 rounded-md text-xs font-medium transition-colors ${
                            bookingDays.includes(day)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={bookingStart}
                        onChange={(e) => setBookingStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={bookingEnd}
                        onChange={(e) => setBookingEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══════════════ TAB 2: BOOKING PAGE ════════════════════ */}
          <TabsContent value="booking" className="space-y-5 pt-4">
            {/* Booking URL */}
            {bookingUrl && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <Label className="text-sm font-medium">Booking Page URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={bookingUrl}
                    readOnly
                    className="text-xs font-mono bg-background"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  {isEditing && editingType?.bookingToken && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingUrl);
                        toast.success("Booking link copied!");
                      }}
                      title="Copy booking link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {!isEditing && (
                  <p className="text-xs text-muted-foreground">
                    URL will be generated after saving
                  </p>
                )}
              </div>
            )}

            {/* Confirmation Page */}
            <div className="rounded-lg border p-4 space-y-3">
              <Label className="text-sm font-medium">Confirmation Page</Label>
              <p className="text-xs text-muted-foreground -mt-2">
                What happens after someone books a meeting
              </p>
              <Select
                value={confirmationPage}
                onValueChange={(v) => setConfirmationPage(v as "default" | "redirect")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Show Confirmation Message</SelectItem>
                  <SelectItem value="redirect">Redirect to External URL</SelectItem>
                </SelectContent>
              </Select>
              {confirmationPage === "redirect" && (
                <div className="space-y-1">
                  <Label className="text-xs">Redirect URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/thank-you"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Booking Questions */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Booking Questions</Label>
                  <p className="text-xs text-muted-foreground">
                    Custom questions for invitees (name &amp; email are always included)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Question
                </Button>
              </div>

              {bookingQuestions.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                  No custom questions yet. Click &quot;Add Question&quot; to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {bookingQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-md border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{q.question}</div>
                        <div className="text-xs text-muted-foreground">
                          {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
                          {q.required ? " • Required" : " • Optional"}
                          {q.options && q.options.length > 0
                            ? ` • ${q.options.length} options`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditQuestion(q)}
                        >
                          <span className="sr-only">Edit</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══════════════ TAB 3: REMINDERS ════════════════════════ */}
          <TabsContent value="reminders" className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Send email or text reminders before meetings
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddReminder}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Reminder
              </Button>
            </div>

            {reminders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
                No reminders configured. Click &quot;Add Reminder&quot; to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((r) => {
                  const whenLabel =
                    r.when >= 1440
                      ? `${Math.floor(r.when / 1440)} day(s)`
                      : r.when >= 60
                      ? `${Math.floor(r.when / 60)} hour(s)`
                      : `${r.when} min`;
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                        r.enabled ? "bg-background" : "bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Send to {r.who} via {r.channel} • {whenLabel} before
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditReminder(r)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteReminder(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isEditing && reminders.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Reminders will be saved when you create the meeting type
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                {isEditing ? "Update Meeting Type" : "Create Meeting Type"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Question Editor Modal ─────────────────────────────────────── */}
    <QuestionEditorModal
      open={showQuestionEditor}
      onClose={() => { setShowQuestionEditor(false); setEditingQuestion(null); }}
      onSave={handleSaveQuestion}
      initialData={editingQuestion}
    />

    {/* ── Reminder Form Modal ─────────────────────────────────────── */}
    <ReminderFormModal
      open={showReminderForm}
      onClose={() => { setShowReminderForm(false); setEditingReminder(null); }}
      onSave={handleSaveReminder}
      initialData={editingReminder}
    />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// QUESTION EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════

function QuestionEditorModal({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { question: string; type: BookingQuestion["type"]; required: boolean; options?: string[] }) => void;
  initialData: BookingQuestion | null;
}) {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<BookingQuestion["type"]>("text");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setType(initialData.type);
      setRequired(initialData.required);
      setOptionsText(initialData.options?.join("\n") || "");
    } else {
      setQuestion("");
      setType("text");
      setRequired(false);
      setOptionsText("");
    }
  }, [initialData, open]);

  const hasOptions = type === "radio" || type === "checkbox" || type === "dropdown";

  const handleSave = () => {
    if (!question.trim()) return;
    onSave({
      question: question.trim(),
      type,
      required,
      options: hasOptions
        ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            Create a custom question for your booking form
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Question Text</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What company are you from?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Answer Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BookingQuestion["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((qt) => (
                  <SelectItem key={qt.value} value={qt.value}>
                    {qt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasOptions && (
            <div className="space-y-1.5">
              <Label>Options (one per line)</Label>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={setRequired} id="q-required" />
            <Label htmlFor="q-required" className="cursor-pointer">Required</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!question.trim()}>
            {initialData ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REMINDER FORM MODAL
// ═══════════════════════════════════════════════════════════════════

const WHO_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "myself", label: "Myself" },
  { value: "team", label: "Team" },
  { value: "all", label: "All Invitees" },
];

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "text", label: "Text Message" },
];

function ReminderFormModal({
  open,
  onClose,
  onSave,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ReminderConfig, "id">) => void;
  initialData: ReminderConfig | null;
}) {
  const [who, setWho] = useState<string>("client");
  const [channel, setChannel] = useState<string>("email");
  const [whenValue, setWhenValue] = useState("15");
  const [whenUnit, setWhenUnit] = useState("minutes");

  useEffect(() => {
    if (initialData) {
      setWho(initialData.who);
      setChannel(initialData.channel);
      const val = initialData.when;
      if (val >= 1440) {
        setWhenValue(String(Math.floor(val / 1440)));
        setWhenUnit("days");
      } else if (val >= 60) {
        setWhenValue(String(Math.floor(val / 60)));
        setWhenUnit("hours");
      } else {
        setWhenValue(String(val));
        setWhenUnit("minutes");
      }
    } else {
      setWho("client");
      setChannel("email");
      setWhenValue("15");
      setWhenUnit("minutes");
    }
  }, [initialData, open]);

  const handleSave = () => {
    const val = parseInt(whenValue, 10) || 0;
    const whenMinutes =
      whenUnit === "days" ? val * 1440
      : whenUnit === "hours" ? val * 60
      : val;

    if (whenMinutes <= 0) return;

    const title = `${whenValue} ${whenUnit} before via ${channel}`;

    onSave({
      title,
      who: who as ReminderConfig["who"],
      channel: channel as ReminderConfig["channel"],
      when: whenMinutes,
      enabled: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Reminder" : "Add Reminder"}</DialogTitle>
          <DialogDescription>
            Configure when and how to send reminders
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Who Should Be Reminded?</Label>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>How to Send?</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>When to Send?</Label>
            <div className="flex gap-3">
              <div className="w-24">
                <Input
                  type="number"
                  min={1}
                  value={whenValue}
                  onChange={(e) => setWhenValue(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Select value={whenUnit} onValueChange={setWhenUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes before</SelectItem>
                    <SelectItem value="hours">Hours before</SelectItem>
                    <SelectItem value="days">Days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!whenValue || parseInt(whenValue) <= 0}>
            {initialData ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
