import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const INVITES_COLLECTION = "workspace_invites";

/**
 * GET /api/workspaces/invite/check?inviteId=XXX
 *
 * Loads invite details for the accept-invite page.
 * No auth required - the inviteId acts as a token.
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function GET(req: NextRequest) {
  try {
    const inviteId = req.nextUrl.searchParams.get("inviteId");

    if (!inviteId || typeof inviteId !== "string") {
      return NextResponse.json(
        { error: "inviteId is required" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = getAdminDb();
    } catch (err) {
      console.error("Failed to initialize Admin SDK in invite check:", err);
      return NextResponse.json(
        { error: "Server configuration error. Please contact the workspace owner." },
        { status: 500 }
      );
    }
    const inviteRef = db.collection(INVITES_COLLECTION).doc(inviteId);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const data = inviteSnap.data() as {
      workspaceId: string;
      email: string;
      role: string;
      status: string;
      expiresAt: { toDate: () => Date };
      createdAt: { toDate: () => Date };
    };

    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
    let status = data.status;
    if (status === "pending" && expiresAt < now) {
      status = "expired";
    }

    // Get workspace name
    let workspaceName = "Unknown Workspace";
    try {
      const workspaceSnap = await db
        .collection("workspaces")
        .doc(data.workspaceId)
        .get();
      if (workspaceSnap.exists) {
        workspaceName =
          (workspaceSnap.data() as { name?: string })?.name ||
          "Unknown Workspace";
      }
    } catch {
      // Non-critical - workspace name is just for display
    }

    return NextResponse.json({
      id: inviteId,
      workspaceId: data.workspaceId,
      workspaceName,
      email: data.email,
      role: data.role,
      status,
      expiresAt: expiresAt.toISOString(),
      createdAt: data.createdAt?.toDate?.().toISOString() || null,
    });
  } catch (error) {
    console.error("Invite check error:", error);
    return NextResponse.json(
      { error: "Failed to load invitation" },
      { status: 500 }
    );
  }
}
