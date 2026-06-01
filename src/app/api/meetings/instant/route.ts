import { NextRequest, NextResponse } from "next/server";
import { createGoogleMeetEvent } from "@/lib/calendar";
import { createMeeting } from "@/lib/firebase/server-admin";
import { withAuth } from "@/lib/api/middleware";

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const { attendees, conversationId, leadId, clientId } = body;

      if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
        return NextResponse.json({ error: "At least one attendee is required" }, { status: 400 });
      }

      for (const a of attendees) {
        if (!a.email) {
          return NextResponse.json({ error: "Each attendee must have an email" }, { status: 400 });
        }
      }

      // 1. Create Google Calendar event with Google Meet (workspace-level)
      const meetResult = await createGoogleMeetEvent(ctx.workspaceId, attendees);

      // 2. Store meeting in Firestore
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const meetingId = await createMeeting({
        workspaceId: ctx.workspaceId,
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        conversationId: conversationId || undefined,
        title: `Meeting with ${attendees.map((a: { name?: string; email: string }) => a.name || a.email).join(", ")}`,
        startTime,
        endTime,
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
        createdBy: ctx.userId,
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
  });
}
