import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

/**
 * POST /api/workspaces/clients/init-portal
 * Initialize default client portal settings for a workspace.
 * Owner/admin only. Creates the settings doc with system defaults
 * so clients can read it from Firestore.
 */
export async function POST(request: Request) {
  try {
    // Step 1: Verify Firebase ID token (prevents auth bypass)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return NextResponse.json({ error: "Empty token" }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const workspaceId = request.headers.get("x-workspace-id");
    if (!workspaceId) {
      return NextResponse.json({ error: "x-workspace-id header required" }, { status: 400 });
    }

    // Step 2: Verify user exists and is owner/admin of this workspace
    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const userData = userSnap.data()!;
    const workspaceRoles: Record<string, string> = userData.workspaceRoles || {};
    const role = workspaceRoles[workspaceId] || userData.role || null;

    const workspaceRef = db.collection("workspaces").doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();
    if (!workspaceSnap.exists) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspaceData = workspaceSnap.data()!;
    const isOwner = workspaceData.ownerId === userId;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Only workspace owner or admin can initialize portal settings" }, { status: 403 });
    }

    // Check if settings already exist
    const settingsRef = getAdminDb().collection("client_portal_settings").doc(workspaceId);
    const existing = await settingsRef.get();
    if (existing.exists) {
      return NextResponse.json({ message: "Settings already exist", exists: true });
    }

    // Create default settings
    await settingsRef.set({
      modules: {
        projects: true,
        messages: true,
        meetings: true,
        invoices: true,
        documents: true,
        time_tracking: true,
        project_requests: true,
      },
      welcomeCard: {
        title: "Welcome to the Client Portal",
        description:
          "We're excited to have you onboard. Here you can track your projects, communicate with our team, and manage everything in one place.",
        bulletPoints: [
          "View real-time project progress and updates",
          "Send and receive messages with your project team",
          "Access shared documents and resources",
        ],
        mediaUrl: null,
        mediaType: null,
        showOnFirstVisitOnly: true,
        enabled: true,
      },
      checklist: {
        enabled: true,
        steps: [],
      },
      helpfulLinks: [],
      helpfulFiles: [],
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    });

    return NextResponse.json({ message: "Portal settings initialized", exists: false });
  } catch (error) {
    console.error("Failed to initialize portal settings:", error);
    return NextResponse.json(
      { error: "Failed to initialize portal settings" },
      { status: 500 }
    );
  }
}
