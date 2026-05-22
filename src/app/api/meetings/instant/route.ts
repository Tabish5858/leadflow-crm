import { NextRequest, NextResponse } from "next/server";
import { createGoogleMeetEvent } from "@/lib/calendar";
import { createMeeting } from "@/lib/firebase/meetings";
import { Timestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, workspaceId, attendees, conversationId, leadId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ error: "At least one attendee is required" }, { status: 400 });
    }

    for (const a of attendees) {
      if (!a.email) {
        return NextResponse.json({ error: "Each attendee must have an email" }, { status: 400 });
      }
    }

    // 1. Create Google Calendar event with Google Meet
    const meetResult = await createGoogleMeetEvent(userId, attendees);

    // 2. Store meeting in Firestore
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    const meetingId = await createMeeting({
      workspaceId,
      leadId: leadId || undefined,
      conversationId: conversationId || undefined,
      title: `Meeting with ${attendees.map((a: { name?: string; email: string }) => a.name || a.email).join(", ")}`,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      attendees: attendees.map((a: { email: string; name?: string }) => ({
        email: a.email,
        name: a.name || "",
      })),
      conferencingTool: "google_meet",
      googleMeetLink: meetResult.meetLink,
      calendarEventId: meetResult.calendarEventId,
      calendarEventUrl: meetResult.calendarEventUrl,
      status: "scheduled",
      meetingType: "instant",
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      meetingId,
      meetLink: meetResult.meetLink,
      calendarEventId: meetResult.calendarEventId,
      calendarEventUrl: meetResult.calendarEventUrl,
    });
  } catch (error) {
    console.error("Failed to create instant meeting:", error);

    const message = error instanceof Error ? error.message : "Failed to create meeting";

    if (message.includes("Google Calendar not connected")) {
      return NextResponse.json({ error: message, needsCalendarAuth: true }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
