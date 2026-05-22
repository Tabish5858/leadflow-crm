"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, AlertCircle, Video } from "lucide-react";
import { toast } from "@/lib/toast";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  workspaceId: string;
  conversationId: string;
  leadId?: string;
  attendees: { email: string; name?: string }[];
  onMeetingCreated: (meetLink: string, calendarEventUrl?: string) => Promise<void>;
}

type DialogState = "checking" | "not_connected" | "creating" | "error";

export function CreateMeetingDialog({
  open,
  onOpenChange,
  userId,
  workspaceId,
  conversationId,
  leadId,
  attendees,
  onMeetingCreated,
}: CreateMeetingDialogProps) {
  const [state, setState] = useState<DialogState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  // Reset and start flow every time dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const run = async () => {
      setState("checking");
      setErrorMessage("");

      try {
        // Step 1: Check if Google Calendar is connected
        const statusRes = await fetch(`/api/calendar/status?userId=${userId}`);
        const statusData = await statusRes.json();

        if (cancelled) return;

        if (!statusData.connected) {
          setState("not_connected");
          return;
        }

        // Step 2: Create the Google Meet event
        setState("creating");
        const meetRes = await fetch("/api/meetings/instant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            workspaceId,
            attendees,
            conversationId,
            leadId,
          }),
        });

        const meetData = await meetRes.json();

        if (cancelled) return;

        if (!meetRes.ok) {
          if (meetData.needsCalendarAuth) {
            setState("not_connected");
          } else {
            setState("error");
            setErrorMessage(meetData.error || "Failed to create meeting");
          }
          return;
        }

        // Step 3: Send the meeting card as a message
        await onMeetingCreated(meetData.meetLink, meetData.calendarEventUrl);

        if (cancelled) return;

        toast.meetingLink(meetData.meetLink);
        onOpenChange(false);
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [open, userId, workspaceId, conversationId, leadId, attendees, onMeetingCreated, onOpenChange]);

  const handleConnectCalendar = () => {
    window.location.href = `/api/auth/google?userId=${userId}&redirectTo=/messages`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Google Meet
          </DialogTitle>
          <DialogDescription>
            {state === "checking" && "Checking your Google Calendar connection..."}
            {state === "not_connected" &&
              "Connect your Google Calendar to create video meetings."}
            {state === "creating" && "Creating your meeting link..."}
            {state === "error" && "Something went wrong"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Checking state */}
          {state === "checking" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Verifying your calendar connection...
              </p>
            </div>
          )}

          {/* Creating state */}
          {state === "creating" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Generating a Google Meet link...
              </p>
              <p className="text-xs text-muted-foreground/60">
                This will be sent as a message in the conversation.
              </p>
            </div>
          )}

          {/* Not connected state */}
          {state === "not_connected" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Your Google Calendar is not connected. You need to connect it
                  to create Google Meet links for your conversations.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  After connecting, you&apos;ll be redirected back here — click the
                  meeting button again to send your Meet link.
                </p>
              </div>
              <Button onClick={handleConnectCalendar} size="sm" className="mt-2">
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </Button>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          )}

          {/* Success is transient — dialog auto-closes */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
