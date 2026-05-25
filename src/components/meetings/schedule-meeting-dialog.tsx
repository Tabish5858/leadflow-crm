"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Loader2,
  Video,
  X,
} from "lucide-react";
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

interface MeetingTypeOption {
  id: string;
  name: string;
  duration: number;
  description: string;
  videoTool: "google_meet" | "none";
  slug?: string;
  bookingToken: string;
}

type DialogStep = "select-type" | "details" | "submitting" | "success" | "error";

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

  // Meeting types list
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  // Selected meeting type
  const [selectedType, setSelectedType] = useState<MeetingTypeOption | null>(null);

  // Form fields
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [useNow, setUseNow] = useState(true);
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [description, setDescription] = useState("");

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

  const handleSelectType = (type: MeetingTypeOption) => {
    setSelectedType(type);
    setStep("details");
  };

  const handleBackToTypes = () => {
    setSelectedType(null);
    setStep("select-type");
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    // Compute start time
    let startDateTime: Date;
    if (useNow) {
      startDateTime = new Date();
      startDateTime.setMinutes(startDateTime.getMinutes() + 5); // 5 min from now
    } else {
      if (!startDate || !startTime) {
        toast.error("Please select a date and time");
        return;
      }
      startDateTime = new Date(`${startDate}T${startTime}`);
      if (isNaN(startDateTime.getTime())) {
        toast.error("Invalid date or time");
        return;
      }
      if (startDateTime <= new Date()) {
        toast.error("Meeting must be scheduled in the future");
        return;
      }
    }

    if (attendeeEmails.length === 0 && !preselectedLeadId && !selectedLeadId) {
      toast.error("Please add at least one attendee");
      return;
    }

    setStep("submitting");
    setErrorMessage("");

    try {
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

  // Load meeting types and leads when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep("select-type");
    setErrorMessage("");
    setSelectedType(null);
    setAttendeeEmails([]);
    setAttendeeInput("");
    setSelectedLeadId(preselectedLeadId || "");
    setDescription("");
    setUseNow(true);
    setStartDate("");
    setStartTime("");

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

    // Fetch leads
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
  }, [open, workspaceId, preselectedLeadId]);

  // Set default date/time to next hour when entering details step
  useEffect(() => {
    if (step === "details" && !startDate && !startTime) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      const localISO = now.toISOString().slice(0, 16);
      setStartDate(localISO.slice(0, 10));
      setStartTime(localISO.slice(11, 16));
    }
  }, [step, startDate, startTime]);

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

        {/* ══════════ STEP 2: DETAILS ══════════ */}
        {step === "details" && selectedType && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedType.name}
              </DialogTitle>
              <DialogDescription>
                {selectedType.duration} min
                {selectedType.videoTool === "google_meet" ? " · Google Meet" : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Attendees */}
              <div className="space-y-1.5">
                <Label>Attendees <span className="text-destructive">*</span></Label>
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

              {/* Lead selector */}
              <div className="space-y-1.5">
                <Label>Linked Lead (optional)</Label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a lead...</option>
                  {leadsLoading ? (
                    <option value="_loading" disabled>Loading leads...</option>
                  ) : leads.length === 0 ? (
                    <option value="_none" disabled>No leads found</option>
                  ) : (
                    leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                        {lead.company ? ` — ${lead.company}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Time selection */}
              <div className="space-y-2 rounded-lg border p-3">
                <Label>When</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUseNow(true)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      useNow
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-foreground"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseNow(false)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      !useNow
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-foreground"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                    Pick Date & Time
                  </button>
                </div>
                {!useNow && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
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
              <Button variant="outline" onClick={handleBackToTypes}>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={attendeeEmails.length === 0 && !selectedLeadId && !preselectedLeadId}
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
