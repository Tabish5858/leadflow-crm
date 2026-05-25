import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { ModuleId } from "@/types";
import { canAccessModule } from "@/lib/permissions";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: string;
}

/**
 * Verifies that the request comes from an authenticated user who belongs
 * to the specified workspace. Optionally checks module-level permissions.
 *
 * Returns `AuthContext` on success or a `NextResponse` error on failure.
 */
export async function requireAuth(
  req: NextRequest,
  moduleId?: ModuleId
): Promise<AuthContext | NextResponse> {
  const userId = req.headers.get("x-user-id");
  const workspaceId = req.headers.get("x-workspace-id");

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required. Provide x-user-id header." },
      { status: 401 }
    );
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace ID required. Provide x-workspace-id header." },
      { status: 400 }
    );
  }

  // Verify user exists
  const userSnap = await adminDb.collection("users").doc(userId).get();

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

  // Fetch workspace once (used for fallback role + module permissions)
  const workspaceSnap = await adminDb.collection("workspaces").doc(workspaceId).get();
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

  // Module-level permission check (owner/admin bypass)
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
 */
export async function withAuth(
  req: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
  moduleId?: ModuleId
): Promise<NextResponse> {
  const auth = await requireAuth(req, moduleId);
  if (auth instanceof NextResponse) return auth;
  return handler(auth);
}
