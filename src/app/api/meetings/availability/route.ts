import { NextRequest, NextResponse } from "next/server";
import { getMeetingTypeByToken } from "@/lib/firebase/server-admin";
import { computeAvailableSlots } from "@/lib/availability";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getGoogleAuth,
  getWorkspaceCalendarConfig,
} from "@/lib/calendar";
import { google } from "googleapis";

/**
 * Parse "HH:MM" → minutes since midnight
 */
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Check if [aStart, aEnd] overlaps with [bStart, bEnd]
 */
function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * GET /api/meetings/availability?token=<bookingToken>&date=2026-05-25
 *
 * Public endpoint — no auth required.
 * Returns available time slots for a meeting type on a given date,
 * filtered against both existing Firestore meetings AND Google Calendar
 * events from the workspace's selected calendars.
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: max 100 availability checks per IP per minute
    const ip = getClientIp(req);
    if (!checkRateLimit(`avail:ip:${ip}`, 100, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const token = req.nextUrl.searchParams.get("token");
    const dateStr = req.nextUrl.searchParams.get("date");

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Booking token is required" },
        { status: 400 }
      );
    }

    if (!dateStr || typeof dateStr !== "string") {
      return NextResponse.json(
        { error: "Date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const meetingType = await getMeetingTypeByToken(token);
    if (!meetingType) {
      return NextResponse.json(
        { error: "Meeting type not found or inactive" },
        { status: 404 }
      );
    }

    // Build meeting type info for slot computation
    const meetingTypeInfo = {
      id: meetingType.id,
      workspaceId: meetingType.workspaceId,
      name: meetingType.name,
      duration: meetingType.duration,
      bufferTime: meetingType.bufferTime || 0,
      bufferBefore: meetingType.bufferBefore,
      bufferAfter: meetingType.bufferAfter,
      minimumNotice: meetingType.minimumNotice,
      dailyLimit: meetingType.dailyLimit,
      availability: meetingType.availability,
    };

    const tz = meetingTypeInfo.availability?.timezone || "UTC";

    // 1. Compute base slots from availability settings + existing Firestore meetings
    const slots = await computeAvailableSlots(meetingTypeInfo, dateStr);

    // 2. If Google Calendar is connected, fetch events from selected calendars
    //    and filter out slots that conflict with Google Calendar events.
    let googleConflictingMinutes: Array<{ start: number; end: number }> = [];
    try {
      const auth = await getGoogleAuth(meetingType.workspaceId);
      if (auth) {
        const config = await getWorkspaceCalendarConfig(meetingType.workspaceId);
        const calIds = config.selectedCalendarIds || [];
        if (calIds.length > 0) {
          const [tYear, tMonth, tDay] = dateStr.split("-").map(Number);

          // Build start/end of the business day in the meeting type's timezone
          const startMinutes = meetingTypeInfo.availability
            ? parseTime(meetingTypeInfo.availability.startTime)
            : 9 * 60;
          const endMinutes = meetingTypeInfo.availability
            ? parseTime(meetingTypeInfo.availability.endTime)
            : 17 * 60;

          // Create Date objects for the day boundaries in the meeting tz
          const dayStart = new Date(
            Date.UTC(tYear, tMonth - 1, tDay, 0, 0, 0)
          );
          const dayEnd = new Date(
            Date.UTC(tYear, tMonth - 1, tDay + 1, 0, 0, 0)
          );

          const calClient = google.calendar({ version: "v3", auth: auth.client });

          for (const calId of calIds) {
            try {
              const res = await calClient.events.list({
                calendarId: calId,
                timeMin: dayStart.toISOString(),
                timeMax: dayEnd.toISOString(),
                singleEvents: true,
                maxResults: 50,
              });

              for (const event of res.data.items || []) {
                // Skip all-day events (no specific time conflict)
                if (event.start?.date && !event.start?.dateTime) continue;

                const eventStart = event.start?.dateTime
                  ? new Date(event.start.dateTime)
                  : null;
                const eventEnd = event.end?.dateTime
                  ? new Date(event.end.dateTime)
                  : null;
                if (!eventStart || !eventEnd) continue;

                // Convert event times to the meeting type's timezone → minutes since midnight
                const eventStartInTz = eventStart.toLocaleString("en-CA", {
                  timeZone: tz,
                  hour12: false,
                });
                const eventEndInTz = eventEnd.toLocaleString("en-CA", {
                  timeZone: tz,
                  hour12: false,
                });

                const [, sTimeStr] = eventStartInTz.split(", ");
                const [, eTimeStr] = eventEndInTz.split(", ");

                if (!sTimeStr || !eTimeStr) continue;

                const [sH, sM] = sTimeStr.split(":").map(Number);
                const [eH, eM] = eTimeStr.split(":").map(Number);

                googleConflictingMinutes.push({
                  start: sH * 60 + sM,
                  end: eH * 60 + eM,
                });
              }
            } catch (calErr) {
              console.error(
                `Failed to fetch events from calendar ${calId}:`,
                calErr
              );
            }
          }
        }
      }
    } catch (err) {
      // Non-critical: Google Calendar check failed, proceed with Firestore-only slots
      console.error("Failed to check Google Calendar conflicts for availability:", err);
    }

    // 3. Filter out slots that conflict with Google Calendar events
    const filteredSlots = slots.filter((slotTime) => {
      const slotStart = parseTime(slotTime);
      const slotEnd = slotStart + meetingTypeInfo.duration;

      for (const gcEvent of googleConflictingMinutes) {
        if (overlaps(slotStart, slotEnd, gcEvent.start, gcEvent.end)) {
          return false;
        }
      }
      return true;
    });

    return NextResponse.json({
      date: dateStr,
      slots: filteredSlots,
      duration: meetingTypeInfo.duration,
      timezone: tz,
    });
  } catch (error) {
    console.error("Failed to compute availability:", error);
    return NextResponse.json(
      { error: "Failed to compute availability" },
      { status: 500 }
    );
  }
}
