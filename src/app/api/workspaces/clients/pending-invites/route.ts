import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { getAdminDb } from "@/lib/firebase/admin";

const CLIENT_INVITES_COLLECTION = "client_invites";

/**
 * GET /api/workspaces/clients/pending-invites
 *
 * Lists pending client invitations for the current workspace.
 * Only workspace owner/admin can view pending invites.
 *
 * Headers: Authorization: Bearer <token>, x-workspace-id
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      // Only owner/admin can view pending invites
      if (ctx.role !== "owner" && ctx.role !== "admin") {
        return NextResponse.json(
          { error: "Only workspace owners and admins can view pending invitations" },
          { status: 403 }
        );
      }

      const db = getAdminDb();
      const invitesSnap = await db
        .collection(CLIENT_INVITES_COLLECTION)
        .where("workspaceId", "==", ctx.workspaceId)
        .where("status", "==", "pending")
        .get();

      const invites = await Promise.all(
        invitesSnap.docs.map(async (d) => {
          const data = d.data();
          let invitedByName = "—";
          try {
            const inviterSnap = await db
              .collection("users")
              .doc(data.invitedBy)
              .get();
            if (inviterSnap.exists) {
              invitedByName =
                inviterSnap.data()!.displayName || "—";
            }
          } catch {}
          return {
            id: d.id,
            email: data.email || "",
            status: data.status || "pending",
            message: data.message || null,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() || null,
            expiresAt:
              data.expiresAt?.toDate?.()?.toISOString() || null,
            invitedByName,
          };
        })
      );

      return NextResponse.json({ invites });
    } catch (error) {
      console.error("Failed to list pending invites:", error);
      return NextResponse.json(
        { error: "Failed to load pending invitations" },
        { status: 500 }
      );
    }
  });
}
