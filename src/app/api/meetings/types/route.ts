import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import {
  createMeetingType,
  getMeetingTypes,
} from "@/lib/firebase/server-admin";

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const types = await getMeetingTypes(ctx.workspaceId);
      return NextResponse.json({ types });
    } catch (error) {
      console.error("Failed to list meeting types:", error);
      return NextResponse.json(
        { error: "Failed to list meeting types" },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const { name, duration, bufferTime, bufferBefore, bufferAfter, minimumNotice, dailyLimit, videoTool, description, availability, bookingQuestions, reminders, confirmationPage, redirectUrl } = body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }

      if (!duration || typeof duration !== "number" || duration < 15 || duration > 480) {
        return NextResponse.json(
          { error: "Duration must be between 15 and 480 minutes" },
          { status: 400 }
        );
      }

      const { id, slug } = await createMeetingType({
        workspaceId: ctx.workspaceId,
        name: name.trim(),
        duration: Math.max(15, Math.min(480, duration)),
        bufferTime: Math.max(0, bufferTime || 0),
        bufferBefore: bufferBefore !== undefined ? Math.max(0, bufferBefore) : undefined,
        bufferAfter: bufferAfter !== undefined ? Math.max(0, bufferAfter) : undefined,
        minimumNotice: minimumNotice !== undefined ? Math.max(0, minimumNotice) : undefined,
        dailyLimit: dailyLimit !== undefined ? Math.max(1, dailyLimit) : undefined,
        videoTool: videoTool === "none" ? "none" : "google_meet",
        description: typeof description === "string" ? description : "",
        active: true,
        createdBy: ctx.userId,
        availability: availability || undefined,
        bookingQuestions: Array.isArray(bookingQuestions) ? bookingQuestions : undefined,
        reminders: Array.isArray(reminders) ? reminders : undefined,
        confirmationPage: confirmationPage === "redirect" ? "redirect" : undefined,
        redirectUrl: typeof redirectUrl === "string" ? redirectUrl : undefined,
      });

      // Return the generated slug so the UI can show the booking URL
      return NextResponse.json({ success: true, id, slug });
    } catch (error) {
      console.error("Failed to create meeting type:", error);
      return NextResponse.json(
        { error: "Failed to create meeting type" },
        { status: 500 }
      );
    }
  });
}
