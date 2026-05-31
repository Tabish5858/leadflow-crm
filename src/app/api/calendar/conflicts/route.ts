import { NextRequest, NextResponse } from "next/server";
import { checkGoogleCalendarConflicts } from "@/lib/calendar";
import { withAuth } from "@/lib/api/middleware";

/**
 * POST /api/calendar/conflicts
 * Checks Google Calendar for conflicting events in the time range.
 * 
 * Request body:
 *   startDate: ISO string
 *   endDate: ISO string
 *   calendarIds?: string[] (optional, defaults to selected calendars)
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const { startDate: startDateISO, endDate: endDateISO, calendarIds } = body;

      if (!startDateISO || !endDateISO) {
        return NextResponse.json(
          { error: "startDate and endDate are required" },
          { status: 400 }
        );
      }

      const startDate = new Date(startDateISO);
      const endDate = new Date(endDateISO);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "endDate must be after startDate" },
          { status: 400 }
        );
      }

      const result = await checkGoogleCalendarConflicts(
        ctx.workspaceId,
        startDate,
        endDate,
        calendarIds
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error("Failed to check calendar conflicts:", error);
      return NextResponse.json(
        { error: "Failed to check calendar conflicts" },
        { status: 500 }
      );
    }
  });
}
