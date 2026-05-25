/**
 * Availability time-slot computation engine.
 * Given a meeting type's availability settings and a date,
 * computes which time slots are available for booking.
 */
import { getAdminDb } from "@/lib/firebase/admin";

const SLOT_INTERVAL = 30; // minutes between slot starts

export interface MeetingTypeAvailability {
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "17:00"
  timezone: string;
}

export interface MeetingTypeBookingInfo {
  id: string;
  workspaceId: string;
  name: string;
  duration: number; // minutes
  bufferTime: number; // minutes gap before/after each meeting
  bufferBefore?: number; // minutes buffer before each meeting
  bufferAfter?: number; // minutes buffer after each meeting
  minimumNotice?: number; // minutes advance notice required
  dailyLimit?: number; // max meetings per day
  availability?: MeetingTypeAvailability;
  timezone?: string;
}

/** Parse "HH:MM" → minutes since midnight */
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Format minutes since midnight → "HH:MM" (24h) */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Check if [aStart, aEnd] overlaps with [bStart, bEnd] (inclusive of buffer) */
function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  buffer = 0
): boolean {
  return aStart - buffer < bEnd && aEnd + buffer > bStart;
}

/**
 * For a given meeting type + date, compute all available 30-min start slots.
 *
 * Slots are filtered against:
 *  1. Meeting type's configured availability (days of week, hours)
 *  2. Existing meetings on that date (with buffer time)
 *  3. Past time (if date is today, skip slots that have already started)
 */
export async function computeAvailableSlots(
  meetingType: MeetingTypeBookingInfo,
  dateStr: string // "YYYY-MM-DD"
): Promise<string[]> {
  if (!meetingType.availability) return [];

  const { availability } = meetingType;
  const timezone = availability.timezone || "UTC";

  // Parse the target date parts
  const [tYear, tMonth, tDay] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(tYear, tMonth - 1, tDay).getDay(); // 0=Sun

  // 1. Check if this day of week is available
  if (!availability.daysOfWeek.includes(dayOfWeek)) return [];

  const startMinutes = parseTime(availability.startTime);
  const endMinutes = parseTime(availability.endTime);
  const slotDuration = meetingType.duration;

  // 2. Generate slot grid at SLOT_INTERVAL increments
  const slots: string[] = [];
  for (let m = startMinutes; m + slotDuration <= endMinutes; m += SLOT_INTERVAL) {
    slots.push(formatTime(m));
  }

  // 3. Determine "is today" and "now" in the meeting type's timezone
  const now = new Date();
  const nowInTzStr = now.toLocaleString("en-CA", {
    timeZone: timezone,
    hour12: false,
  });
  // "2026-05-25, 14:30:00"
  const [nowDateStr, nowTimeStr] = nowInTzStr.split(", ");
  const [nYear, nMonth, nDay] = nowDateStr.split("-").map(Number);
  const [nHour, nMin] = nowTimeStr.split(":").map(Number);
  const nowMinutes = nHour * 60 + nMin;

  const isToday = tYear === nYear && tMonth === nMonth && tDay === nDay;

  // 4. Fetch existing meetings for this workspace on this date
  let existingMeetings: Array<{ startMinutes: number; endMinutes: number }> = [];
  try {
    const meetingsSnap = await getAdminDb()
      .collection("meetings")
      .where("workspaceId", "==", meetingType.workspaceId)
      .where("status", "in", ["scheduled", "in_progress"])
      .get();

    existingMeetings = meetingsSnap.docs
      .map((d) => {
        const data = d.data();
        const start = data.startTime?.toDate?.();
        const end = data.endTime?.toDate?.();
        if (!start || !end) return null;

        // Convert meeting times to the meeting type's timezone
        const startInTzStr = start.toLocaleString("en-CA", {
          timeZone: timezone,
          hour12: false,
        });
        const endInTzStr = end.toLocaleString("en-CA", {
          timeZone: timezone,
          hour12: false,
        });

        const [sDateStr] = startInTzStr.split(", ");
        const [sYear, sMonthNum, sDay] = sDateStr.split("-").map(Number);

        // Only consider meetings on the target date
        if (sYear !== tYear || sMonthNum !== tMonth || sDay !== tDay) {
          return null;
        }

        const [, sTimeStr] = startInTzStr.split(", ");
        const [, eTimeStr] = endInTzStr.split(", ");
        const [sH, sM] = sTimeStr.split(":").map(Number);
        const [eH, eM] = eTimeStr.split(":").map(Number);

        return {
          startMinutes: sH * 60 + sM,
          endMinutes: eH * 60 + eM,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  } catch {
    // Non-critical — proceed without conflict checking
  }

  // 5. Enforce minimum notice: slots must be at least `minimumNotice` minutes from now
  const minNotice = meetingType.minimumNotice || 0;

  // 6. Enforce daily limit: count existing meetings on this date
  const dailyLimit = meetingType.dailyLimit || 0;

  // 7. Filter slots
  const available = slots.filter((slotTime) => {
    const slotStart = parseTime(slotTime);
    const slotEnd = slotStart + slotDuration;

    // Skip past slots if today (using meeting type timezone)
    if (isToday) {
      if (slotStart <= nowMinutes) return false;
    }

    // Enforce minimum notice
    if (minNotice > 0) {
      const slotEarliestTime = nowMinutes + minNotice;
      if (slotStart < slotEarliestTime) return false;
    }

    // Enforce daily limit
    if (dailyLimit > 0 && existingMeetings.length >= dailyLimit) return false;

    // Check overlap with existing meetings (with buffer)
    const buffer = meetingType.bufferTime || 0;
    for (const meeting of existingMeetings) {
      if (overlaps(slotStart, slotEnd, meeting.startMinutes, meeting.endMinutes, buffer)) {
        return false;
      }
    }

    return true;
  });

  return available;
}
