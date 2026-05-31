import { NextRequest, NextResponse } from "next/server";
import { getCalendarConnectionStatus } from "@/lib/calendar";
import { withAuth } from "@/lib/api/middleware";

export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const status = await getCalendarConnectionStatus(ctx.workspaceId);
      return NextResponse.json(status);
    } catch (error) {
      console.error("Failed to check calendar status:", error);
      return NextResponse.json(
        { connected: false, email: null, error: "Failed to check connection status" },
        { status: 500 }
      );
    }
  });
}
