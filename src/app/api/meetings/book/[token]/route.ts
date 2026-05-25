import { NextRequest, NextResponse } from "next/server";
import { getMeetingTypeByToken, createMeeting, getWorkspace } from "@/lib/firebase/server-admin";
import { createGoogleMeetEvent } from "@/lib/calendar";

/**
 * GET /api/meetings/book/:token
 * Public — returns meeting type info for the booking page.
 * No auth required — this is consumed by the public booking UI.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      meetingType: {
        id: meetingType.id,
        name: meetingType.name,
        duration: meetingType.duration,
        description: meetingType.description,
        videoTool: meetingType.videoTool,
        availability: meetingType.availability,
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
 * Public — books a meeting time slot.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const meetingType = await getMeetingTypeByToken(token);
    if (!meetingType) {
      return NextResponse.json({ error: "Booking link not found or inactive" }, { status: 404 });
    }

    const body = await req.json();
    const { startTime: startTimeISO, name: attendeeName, email: attendeeEmail, notes } = body;

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

    // Create Google Meet if enabled
    let meetResult: { meetLink: string; calendarEventId: string; calendarEventUrl: string } | null = null;

    if (meetingType.videoTool === "google_meet") {
      try {
        // Use the workspace owner's calendar for Meet creation
        const wsData = await getWorkspace(meetingType.workspaceId);
        if (wsData) {
          const ownerId = (wsData as { ownerId?: string }).ownerId;
          if (ownerId) {
            meetResult = await createGoogleMeetEvent(ownerId, attendees, {
              title: `Meeting: ${meetingType.name}`,
              durationMinutes: meetingType.duration,
              description: `Booked via scheduling page\n\nAttendee: ${attendeeName} (${attendeeEmail})${notes ? `\nNotes: ${notes}` : ""}`,
            });
          }
        }
      } catch {
        // Non-critical — meeting can exist without Meet link
      }
    }

    // Store meeting in Firestore
    const meetingId = await createMeeting({
      workspaceId: meetingType.workspaceId,
      title: `${meetingType.name} — ${attendeeName}`,
      description: notes || undefined,
      startTime: startDate,
      endTime: endDate,
      timezone: meetingType.availability?.timezone || "UTC",
      attendees,
      conferencingTool: meetResult ? "google_meet" : "google_meet",
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
