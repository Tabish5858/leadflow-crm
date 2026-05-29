import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ModuleId } from "@/types";
import { canAccessModule } from "@/lib/permissions";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: string;
}

/**
 * Verifies the Firebase ID token from the Authorization header and extracts
 * the authenticated user ID. Returns the verified uid or a NextResponse error.
 */
async function verifyFirebaseToken(
  req: NextRequest
): Promise<{ uid: string } | NextResponse> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error:
          "Authentication required. Provide Authorization: Bearer <firebase-id-token>.",
      },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7); // Strip "Bearer "
  if (!token) {
    return NextResponse.json(
      { error: "Empty token provided." },
      { status: 401 }
    );
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (err) {
    const message =
      err instanceof Error
        ? `Invalid or expired token: ${err.message}`
        : "Invalid or expired token.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/**
 * Verifies that the request comes from an authenticated user who belongs
 * to the specified workspace. Optionally checks module-level permissions.
 *
 * Requires:
 *   - Authorization: Bearer <firebase-id-token> header
 *   - x-workspace-id header
 *
 * The token is verified via Firebase Admin SDK. The user ID from the
 * decoded token is authoritative — the x-user-id header is NOT used
 * (and is ignored) to prevent impersonation attacks.
 *
 * Returns `AuthContext` on success or a `NextResponse` error on failure.
 */
export async function requireAuth(
  req: NextRequest,
  moduleId?: ModuleId
): Promise<AuthContext | NextResponse> {
  const workspaceId = req.headers.get("x-workspace-id");

  // Step 1: Verify Firebase ID token — this gives us the trusted userId
  const tokenResult = await verifyFirebaseToken(req);
  if (tokenResult instanceof NextResponse) return tokenResult;
  const userId = tokenResult.uid;

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace ID required. Provide x-workspace-id header." },
      { status: 400 }
    );
  }

  // Step 2: Verify user exists in Firestore
  const userSnap = await getAdminDb().collection("users").doc(userId).get();

  if (!userSnap.exists) {
    return NextResponse.json(
      { error: "User account not found." },
      { status: 403 }
    );
  }

  const userData = userSnap.data()!;
  const workspaceRoles: Record<string, string> =
    userData.workspaceRoles || {};
  let role = workspaceRoles[workspaceId] || null;

  // Step 3: Fetch workspace once (used for fallback role + module permissions)
  const workspaceSnap = await getAdminDb().collection("workspaces").doc(workspaceId).get();
  const workspaceData = workspaceSnap.exists ? workspaceSnap.data() : null;

  // Fallback: if workspaceRoles doesn't have this workspace,
  // check legacy workspaceIds + workspace's ownerId/memberIds
  if (!role && workspaceData) {
    const userWorkspaceIds: string[] = userData.workspaceIds || [];
    if (userWorkspaceIds.includes(workspaceId)) {
      if (workspaceData.ownerId === userId) {
        role = "owner";
      } else {
        role = userData.role || "member";
      }
    }
  }

  if (!role) {
    return NextResponse.json(
      { error: "You are not a member of this workspace." },
      { status: 403 }
    );
  }

  // Step 4: Module-level permission check (owner/admin bypass)
  if (moduleId && role !== "owner" && role !== "admin" && workspaceData) {
    const modulePermissions = workspaceData.modulePermissions || null;

    if (!canAccessModule(modulePermissions, role, moduleId)) {
      return NextResponse.json(
        { error: `Access denied. Your role does not have access to ${moduleId}.` },
        { status: 403 }
      );
    }
  }

  return { userId, workspaceId, role };
}

/**
 * Wrapper: extracts auth context or returns the error response directly.
 * Catches all errors (incl. Firebase Admin SDK init failures) and returns
 * a proper JSON error instead of a generic 500 with empty body.
 */
export async function withAuth(
  req: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
  moduleId?: ModuleId
): Promise<NextResponse> {
  try {
    const auth = await requireAuth(req, moduleId);
    if (auth instanceof NextResponse) return auth;
    return handler(auth);
  } catch (error) {
    console.error("withAuth error:", error);
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
