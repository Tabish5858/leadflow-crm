import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/calendar";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

// OAuth state encryption
function encryptState(payload: Record<string, string>): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64");
  const prefix = Math.random().toString(36).substring(2, 10);
  return `${prefix}.${encoded}`;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const redirectTo = req.nextUrl.searchParams.get("redirectTo") || "/settings";

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify the requesting user is the workspace owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check workspace exists and requester is owner
    const wsSnap = await getAdminDb().collection("workspaces").doc(workspaceId).get();
    if (!wsSnap.exists) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const wsData = wsSnap.data()!;
    if (wsData.ownerId !== decoded.uid) {
      return NextResponse.json(
        { error: "Only the workspace owner can connect Google Calendar" },
        { status: 403 }
      );
    }

    const state = encryptState({ workspaceId, redirectTo });

    const cookieStore = await cookies();
    cookieStore.set("calendar_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
      sameSite: "lax",
    });

    const authUrl = getAuthUrl(state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
