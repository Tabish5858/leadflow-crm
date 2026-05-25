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
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/types";

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

type DialogStep = "form" | "submitting" | "success" | "error";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  userId,
  workspaceId,
  preselectedLeadId,
  presetAttendees,
  onMeetingScheduled,
}: ScheduleMeetingDialogProps) {
  const [step, setStep] = useState<DialogStep>("form");
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep("form");
    setErrorMessage("");
    setTitle("");
    setDescription("");
    setStartDate("");
    setStartTime("");
    setDuration("30");
    setAttendeeEmails([]);
    setAttendeeInput("");
    setSelectedLeadId(preselectedLeadId || "");

    // Check calendar status
    (async () => {
      try {
        const res = await fetch("/api/calendar/status", {
          headers: { "x-user-id": userId, "x-workspace-id": workspaceId },
        });
        const data = await res.json();
        setCalendarConnected(data.connected);
      } catch {
        setCalendarConnected(false);
      }
    })();

    // Fetch leads for selector
    (async () => {
      setLeadsLoading(true);
      try {
        const { getDocs, collection, query, where, orderBy } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase/client");
        const q = query(
          collection(db, "leads"),
          where("workspaceId", "==", workspaceId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead);
        setLeads(items);
      } catch {
        // Non-critical
      } finally {
        setLeadsLoading(false);
      }
    })();
  }, [open, userId, workspaceId, preselectedLeadId]);

  const addAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (attendeeEmails.includes(email)) {
      toast.error("This email is already added");
      return;
    }
    setAttendeeEmails((prev) => [...prev, email]);
    setAttendeeInput("");
  };

  const removeAttendee = (email: string) => {
    setAttendeeEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSubmit = async () => {
    // Validate
    if (!title.trim()) {
      toast.error("Meeting title is required");
      return;
    }
    if (!startDate || !startTime) {
      toast.error("Please select a date and time");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    if (isNaN(startDateTime.getTime())) {
      toast.error("Invalid date or time");
      return;
    }
    if (startDateTime <= new Date()) {
      toast.error("Meeting must be scheduled in the future");
      return;
    }

    setStep("submitting");
    setErrorMessage("");

    try {
      // Build attendees list
      const selectedLead = leads.find((l) => l.id === selectedLeadId);
      const allAttendees = [
        ...(presetAttendees || []),
        ...(selectedLead && !presetAttendees?.some((a) => a.email === selectedLead.email)
          ? [{ email: selectedLead.email, name: `${selectedLead.firstName} ${selectedLead.lastName}` }]
          : []),
        ...attendeeEmails.map((email) => ({ email, name: "" })),
      ].filter((a) => a.email);

      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          durationMinutes: parseInt(duration, 10),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees: allAttendees,
          leadId: selectedLeadId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsCalendarAuth) {
          setCalendarConnected(false);
          setStep("error");
          setErrorMessage("Google Calendar is not connected. Please connect in Settings.");
          return;
        }
        setStep("error");
        setErrorMessage(data.error || "Failed to schedule meeting");
        return;
      }

      setStep("success");
      toast.success("Meeting scheduled successfully!");

      onMeetingScheduled?.({
        meetingId: data.meetingId,
        meetLink: data.meetLink,
        title: title.trim(),
        startTime: startDateTime.toISOString(),
      });
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  };

  const handleConnectCalendar = () => {
    window.location.href = `/api/auth/google?userId=${userId}&redirectTo=/meetings`;
  };

  // Set default date/time to next hour
  useEffect(() => {
    if (open && !startDate && !startTime) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      const localISO = now.toISOString().slice(0, 16);
      setStartDate(localISO.slice(0, 10));
      setStartTime(localISO.slice(11, 16));
    }
  }, [open, startDate, startTime]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Meeting
              </DialogTitle>
              <DialogDescription>
                Create a scheduled meeting with Google Meet
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Calendar connection status */}
              {calendarConnected === false && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-300">
                  <div className="flex-1">
                    <p className="font-medium">Calendar not connected</p>
                    <p className="text-xs mt-0.5">
                      Connect to schedule meetings with Google Meet links
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConnectCalendar}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Connect
                  </Button>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Discovery Call with Acme Corp"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">
                    Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead selector */}
              <div className="space-y-1.5">
                <Label htmlFor="lead">Linked Lead (optional)</Label>
                <Select
                  value={selectedLeadId}
                  onValueChange={setSelectedLeadId}
                >
                  <SelectTrigger id="lead">
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leadsLoading ? (
                      <SelectItem value="_loading" disabled>
                        Loading leads...
                      </SelectItem>
                    ) : leads.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No leads found
                      </SelectItem>
                    ) : (
                      leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.firstName} {lead.lastName}
                          {lead.company ? ` — ${lead.company}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Attendees */}
              <div className="space-y-1.5">
                <Label>Additional Attendees (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAttendee();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addAttendee}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
                {attendeeEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {attendeeEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeAttendee(email)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Meeting agenda, notes, etc."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !startDate || !startTime}
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                Schedule Meeting
              </Button>
            </DialogFooter>
          </>
        )}

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

        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Calendar className="h-6 w-6 text-green-500" />
            </div>
            <p className="font-medium">Meeting Scheduled!</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              The meeting has been created and invitations sent.
            </p>
            <Button
              className="mt-2"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        )}

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
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button onClick={() => setStep("form")}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
