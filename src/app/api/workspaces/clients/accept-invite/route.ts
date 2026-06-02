import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const CLIENT_INVITES_COLLECTION = "client_invites";
const WORKSPACES_COLLECTION = "workspaces";
const USERS_COLLECTION = "users";

/**
 * POST /api/workspaces/clients/accept-invite
 *
 * Accepts a client invitation. Uses Admin SDK to bypass Firestore security rules.
 * Sets the user's workspace role to "client" and adds them to the workspace.
 *
 * Body: { token: string }
 * Auth: Bearer token (required - user must be logged in)
 */
export async function POST(req: NextRequest) {
  try {
    // ── Verify auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decodedToken;
    try {
      const auth = getAdminAuth();
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Rate limiting: max 20 accept attempts per IP per minute
    const clientIp = getClientIp(req);
    if (!checkRateLimit(`accept-invite:${clientIp}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const uid = decodedToken.uid;
    const body = await req.json();
    const { token: inviteToken } = body;

    if (!inviteToken || typeof inviteToken !== "string") {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // ── Read invite document ─────────────────────────────────────
    const inviteRef = db.collection(CLIENT_INVITES_COLLECTION).doc(inviteToken);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const inviteData = inviteSnap.data()!;

    if (inviteData.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(0);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    const workspaceId = inviteData.workspaceId;

    // ── Verify email match ───────────────────────────────────────
    const userSnap = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 403 }
      );
    }

    const userData = userSnap.data()!;
    const inviteEmail = inviteData.email?.toLowerCase().trim();
    const userEmail = userData.email?.toLowerCase().trim();

    if (inviteEmail !== userEmail) {
      return NextResponse.json(
        {
          error:
            "This invitation was sent to a different email address. " +
            "Please sign in with the email address that received the invitation.",
        },
        { status: 403 }
      );
    }

    // ── Start atomic batch ───────────────────────────────────────
    const batch = db.batch();

    // Update invite status
    batch.update(inviteRef, {
      status: "accepted",
      acceptedAt: new Date(),
      acceptedBy: uid,
    });

    // Add user to workspace memberIds
    const workspaceRef = db.collection(WORKSPACES_COLLECTION).doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();
    if (workspaceSnap.exists) {
      const workspaceData = workspaceSnap.data()!;
      const memberIds: string[] = workspaceData.memberIds || [];
      if (!memberIds.includes(uid)) {
        batch.update(workspaceRef, {
          memberIds: [...memberIds, uid],
        });
      }
    }

    // Update user document with workspace role
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const workspaceIds: string[] = userData.workspaceIds || [];
    const workspaceRoles: Record<string, string> = userData.workspaceRoles || {};

    const updates: Record<string, unknown> = {};

    if (!workspaceIds.includes(workspaceId)) {
      updates.workspaceIds = [...workspaceIds, workspaceId];
    }

    if (!userData.activeWorkspaceId) {
      updates.activeWorkspaceId = workspaceId;
    }

    if (!workspaceRoles[workspaceId]) {
      workspaceRoles[workspaceId] = "client";
      updates.workspaceRoles = workspaceRoles;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(userRef, updates);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      workspaceId,
      role: "client",
    });
  } catch (error) {
    console.error("Client invite accept error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
