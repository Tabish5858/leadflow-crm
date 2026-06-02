import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";

/**
 * GET /api/workspaces/can-create
 *
 * Checks whether the authenticated user's email is allowed to create workspaces.
 * Uses server-only env var (not exposed to client bundle).
 * The env var is a comma-separated list of allowed email addresses.
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    // Read from server-only env var (NOT NEXT_PUBLIC_ — that leaks to browser)
    const raw = process.env.ALLOWED_WORKSPACE_CREATORS
      // Fallback to old NEXT_PUBLIC_ name for backward compatibility
      || process.env.NEXT_PUBLIC_ALLOWED_WORKSPACE_CREATORS;

    if (!raw) {
      return NextResponse.json({ canCreate: false });
    }

    // Fetch user's email from Firestore
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const userSnap = await getAdminDb().collection("users").doc(ctx.userId).get();
    const userData = userSnap.data() as { email?: string } | undefined;
    const email = userData?.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ canCreate: false });
    }

    const allowed = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    return NextResponse.json({ canCreate: allowed.includes(email) });
  });
}
