import { NextRequest, NextResponse } from "next/server";
import { createGoogleMeetEvent } from "@/lib/calendar";
import { createMeeting, logMeeting } from "@/lib/firebase/server-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAuth } from "@/lib/api/middleware";

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const {
        title,
        description,
        startTime: startTimeISO,
        durationMinutes,
        timezone,
        attendees,
        leadId,
      } = body;

      // ── Validation ──────────────────────────────────────────────
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Meeting title is required" }, { status: 400 });
      }

      if (!startTimeISO) {
        return NextResponse.json({ error: "Start time is required" }, { status: 400 });
      }

      const startDate = new Date(startTimeISO);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
      }

      const duration = durationMinutes && typeof durationMinutes === "number"
        ? Math.max(15, Math.min(480, durationMinutes))
        : 30;

      const endDate = new Date(startDate.getTime() + duration * 60000);

      // ── Conflict detection: check for overlapping meetings ──────
      try {
        const overlappingSnap = await getAdminDb()
          .collection("meetings")
          .where("workspaceId", "==", ctx.workspaceId)
          .where("status", "in", ["scheduled", "in_progress"])
          .get();

        const hasConflict = overlappingSnap.docs.some((doc) => {
          const m = doc.data();
          const mStart = m.startTime?.toDate?.();
          const mEnd = m.endTime?.toDate?.();
          if (!mStart || !mEnd) return false;
          // Overlap: new start < existing end AND new end > existing start
          return startDate < mEnd && endDate > mStart;
        });

        if (hasConflict) {
          return NextResponse.json(
            { error: "This time slot overlaps with an existing meeting" },
            { status: 409 }
          );
        }
      } catch {
        // Non-critical — proceed without conflict check if query fails
      }

      const meetingAttendees = Array.isArray(attendees) && attendees.length > 0
        ? attendees.map((a: { email: string; name?: string }) => ({
            email: a.email,
            name: a.name || "",
          }))
        : [];

      const meetingTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      // ── 1. Create Google Calendar event with Meet ───────────────
      let meetResult: { meetLink: string; calendarEventId: string; calendarEventUrl: string } | null = null;

      if (meetingAttendees.length > 0) {
        try {
          meetResult = await createGoogleMeetEvent(ctx.userId, meetingAttendees, {
            title: title.trim(),
            durationMinutes: duration,
            description: description || "",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message.includes("Google Calendar not connected")) {
            return NextResponse.json(
              { error: message, needsCalendarAuth: true },
              { status: 401 }
            );
          }
          throw err;
        }
      }

      // ── 2. Store meeting in Firestore ───────────────────────────
      const meetingId = await createMeeting({
        workspaceId: ctx.workspaceId,
        leadId: leadId || undefined,
        title: title.trim(),
        description: description || undefined,
        startTime: startDate,
        endTime: endDate,
        timezone: meetingTimezone,
        attendees: meetingAttendees,
        conferencingTool: meetResult ? "google_meet" : "google_meet",
        googleMeetLink: meetResult?.meetLink || "",
        calendarEventId: meetResult?.calendarEventId || "",
        calendarEventUrl: meetResult?.calendarEventUrl || undefined,
        status: "scheduled",
        meetingType: "scheduled",
        createdBy: ctx.userId,
      });

      // ── 3. Log activity if linked to a lead ─────────────────────
      if (leadId) {
        try {
          await logMeeting(
            leadId,
            ctx.workspaceId,
            ctx.userId,
            title.trim(),
            description || null,
            duration
          );
        } catch {
          // Non-critical — don't fail the request
        }
      }

      return NextResponse.json({
        success: true,
        meetingId,
        meetLink: meetResult?.meetLink || null,
        calendarEventId: meetResult?.calendarEventId || null,
        calendarEventUrl: meetResult?.calendarEventUrl || null,
      });
    } catch (error) {
      console.error("Failed to schedule meeting:", error);
      const message = error instanceof Error ? error.message : "Failed to schedule meeting";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
