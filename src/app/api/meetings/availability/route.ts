import { NextRequest, NextResponse } from "next/server";
import { getMeetingTypeByToken } from "@/lib/firebase/server-admin";
import { computeAvailableSlots } from "@/lib/availability";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/meetings/availability?token=<bookingToken>&date=2026-05-25
 *
 * Public endpoint — no auth required.
 * Returns available time slots for a meeting type on a given date.
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

    const slots = await computeAvailableSlots(meetingTypeInfo, dateStr);

    return NextResponse.json({
      date: dateStr,
      slots,
      duration: meetingTypeInfo.duration,
      timezone: meetingTypeInfo.availability?.timezone || "UTC",
    });
  } catch (error) {
    console.error("Failed to compute availability:", error);
    return NextResponse.json(
      { error: "Failed to compute availability" },
      { status: 500 }
    );
  }
}
