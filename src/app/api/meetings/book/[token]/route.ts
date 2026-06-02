import { NextRequest, NextResponse } from "next/server";
import { getMeetingTypeByToken, createMeeting, getWorkspace } from "@/lib/firebase/server-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { createGoogleMeetEvent, checkGoogleCalendarConflicts } from "@/lib/calendar";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/meetings/book/:token
 * Public - returns meeting type info for the booking page.
 * No auth required - this is consumed by the public booking UI.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit: max 60 booking page loads per IP per minute
    const ip = getClientIp(req);
    if (!checkRateLimit(`bookget:ip:${ip}`, 60, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { token } = await params;
    const meetingType = await getMeetingTypeByToken(token);
    if (!meetingType) {
      return NextResponse.json({ error: "Booking link not found or inactive" }, { status: 404 });
    }

    // Get workspace name for branding
    let workspaceName = "Unknown Workspace";
    try {
      const wsData = await getWorkspace(meetingType.workspaceId);
      if (wsData) {
        workspaceName = (wsData as { name?: string }).name || workspaceName;
      }
    } catch (err) {
      console.error("Failed to fetch workspace name for meeting type, using default:", err);
    }

    return NextResponse.json({
      meetingType: {
        id: meetingType.id,
        name: meetingType.name,
        duration: meetingType.duration,
        description: meetingType.description,
        videoTool: meetingType.videoTool,
        availability: meetingType.availability,
        bookingQuestions: meetingType.bookingQuestions || [],
        confirmationPage: meetingType.confirmationPage || "default",
        redirectUrl: meetingType.redirectUrl || "",
      },
      workspaceName,
    });
  } catch (error) {
    console.error("Failed to get booking info:", error);
    return NextResponse.json({ error: "Failed to load booking page" }, { status: 500 });
  }
}

/**
 * POST /api/meetings/book/:token
 * Public - books a meeting time slot.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: max 5 bookings per IP per hour, 10 per token per hour
    const ip = getClientIp(req);
    if (!checkRateLimit(`book:ip:${ip}`, 5, 3600_000)) {
      return NextResponse.json({ error: "Too many booking attempts. Please try again later." }, { status: 429 });
    }
    if (!checkRateLimit(`book:token:${token}`, 10, 3600_000)) {
      return NextResponse.json({ error: "This booking link is temporarily busy. Please try again later." }, { status: 429 });
    }

    const meetingType = await getMeetingTypeByToken(token);
    if (!meetingType) {
      return NextResponse.json({ error: "Booking link not found or inactive" }, { status: 404 });
    }

    const body = await req.json();
    const { startTime: startTimeISO, name: attendeeName, email: attendeeEmail, notes, questionAnswers } = body;

    if (!startTimeISO) {
      return NextResponse.json({ error: "Start time is required" }, { status: 400 });
    }

    const startDate = new Date(startTimeISO);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }

    if (!attendeeName || typeof attendeeName !== "string") {
      return NextResponse.json({ error: "Your name is required" }, { status: 400 });
    }

    if (!attendeeEmail || typeof attendeeEmail !== "string" || !attendeeEmail.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + meetingType.duration * 60000);
    const attendees = [{ email: attendeeEmail, name: attendeeName }];

    // Build description with booking question answers
    let descriptionText = notes || "";
    if (questionAnswers && typeof questionAnswers === "object" && meetingType.bookingQuestions?.length) {
      const answerLines = meetingType.bookingQuestions
        .filter((q) => questionAnswers[q.id])
        .map((q) => {
          const answer = questionAnswers[q.id];
          const value = Array.isArray(answer) ? answer.join(", ") : answer;
          return `${q.question}: ${value}`;
        });
      if (answerLines.length > 0) {
        const answersBlock = answerLines.join("\n");
        descriptionText = descriptionText
          ? `${descriptionText}\n\nBooking Answers:\n${answersBlock}`
          : `Booking Answers:\n${answersBlock}`;
      }
    }

    // ── Conflict detection: check for overlapping meetings ──────
    try {
      const overlappingSnap = await getAdminDb()
        .collection("meetings")
        .where("workspaceId", "==", meetingType.workspaceId)
        .where("status", "in", ["scheduled", "in_progress"])
        .get();

      const hasConflict = overlappingSnap.docs.some((doc) => {
        const m = doc.data();
        const mStart = m.startTime?.toDate?.();
        const mEnd = m.endTime?.toDate?.();
        if (!mStart || !mEnd) return false;
        return startDate < mEnd && endDate > mStart;
      });

      if (hasConflict) {
        return NextResponse.json(
          { error: "This time slot is no longer available" },
          { status: 409 }
        );
      }
    } catch (err) {
      console.error("Conflict detection query failed, proceeding without check:", err);
    }

    // ── Google Calendar conflict check ────────────────────────
    try {
      const { hasConflict } = await checkGoogleCalendarConflicts(
        meetingType.workspaceId,
        startDate,
        endDate
      );
      if (hasConflict) {
        return NextResponse.json(
          { error: "This time slot conflicts with an existing Google Calendar event" },
          { status: 409 }
        );
      }
    } catch (err) {
      console.error("Google Calendar conflict check failed, proceeding without:", err);
    }

    // Create Google Meet if enabled (workspace-level calendar)
    let meetResult: { meetLink: string; calendarEventId: string; calendarEventUrl: string } | null = null;

    if (meetingType.videoTool === "google_meet") {
      try {
        // Use the workspace's connected Google Calendar for Meet creation
        meetResult = await createGoogleMeetEvent(meetingType.workspaceId, attendees, {
          title: `Meeting: ${meetingType.name}`,
          startTime: startDate,
          durationMinutes: meetingType.duration,
          description: `Booked via scheduling page\n\nAttendee: ${attendeeName} (${attendeeEmail})${descriptionText ? `\n\n${descriptionText}` : ""}`,
        });
      } catch (err) {
        console.error("Failed to create Google Meet for booking:", err);
      }
    }

    // Store meeting in Firestore
    const meetingId = await createMeeting({
      workspaceId: meetingType.workspaceId,
      title: `${meetingType.name} - ${attendeeName}`,
      description: descriptionText || undefined,
      startTime: startDate,
      endTime: endDate,
      timezone: meetingType.availability?.timezone || "UTC",
      attendees,
      conferencingTool: meetResult ? "google_meet" : "none",
      googleMeetLink: meetResult?.meetLink || "",
      calendarEventId: meetResult?.calendarEventId || "",
      calendarEventUrl: meetResult?.calendarEventUrl || undefined,
      status: "scheduled",
      meetingType: "scheduled",
      createdBy: meetingType.createdBy,
    });

    return NextResponse.json({
      success: true,
      meetingId,
      meetLink: meetResult?.meetLink || null,
    });
  } catch (error) {
    console.error("Failed to book meeting:", error);
    return NextResponse.json({ error: "Failed to book meeting" }, { status: 500 });
  }
}
