import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const CLIENT_INVITES_COLLECTION = "client_invites";

/**
 * GET /api/workspaces/clients/check-invite?token=INVITE_ID
 *
 * Public endpoint that returns basic invite details for the accept page.
 * No auth required - only returns non-sensitive metadata.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const inviteRef = db.collection(CLIENT_INVITES_COLLECTION).doc(token);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const inviteData = inviteSnap.data()!;

    // Check validity
    if (inviteData.status !== "pending") {
      return NextResponse.json(
        {
          error: "This invitation has already been used or cancelled",
          status: inviteData.status,
        },
        { status: 400 }
      );
    }

    const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(0);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Fetch workspace name and inviter name
    const workspaceSnap = await db
      .collection("workspaces")
      .doc(inviteData.workspaceId)
      .get();
    const workspaceName = workspaceSnap.exists
      ? (workspaceSnap.data()!.name || "Unknown Workspace")
      : "Unknown Workspace";

    const inviterSnap = await db
      .collection("users")
      .doc(inviteData.invitedBy)
      .get();
    const inviterName = inviterSnap.exists
      ? (inviterSnap.data()!.displayName || "A team member")
      : "A team member";

    return NextResponse.json({
      valid: true,
      workspaceName,
      inviterName,
      email: inviteData.email,
      message: inviteData.message || null,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Check client invite error:", error);
    return NextResponse.json(
      { error: "Failed to verify invitation" },
      { status: 500 }
    );
  }
}
