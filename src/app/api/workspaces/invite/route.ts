import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { renderInviteEmail } from "@/lib/email-templates";

const INVITES_COLLECTION = "workspace_invites";
const MAX_PENDING_INVITES = 50;

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/workspaces/invite
 *
 * Creates a workspace invite and sends an invitation email.
 * Enterprise-grade checks: self-invite prevention, duplicate detection,
 * existing member detection, pending-invite limit.
 *
 * Headers: x-user-id, x-workspace-id
 * Body: { email: string, role: "admin" | "member" | "viewer" }
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const { email, role } = body;

      // ── Validation ──────────────────────────────────────────────
      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { error: "Email address is required" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (!isValidEmail(normalizedEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address" },
          { status: 400 }
        );
      }

      if (normalizedEmail.length > 254) {
        return NextResponse.json(
          { error: "Email address is too long" },
          { status: 400 }
        );
      }

      // ── Self-invite prevention ──────────────────────────────────
      const inviterSnap = await getAdminDb()
        .collection("users")
        .doc(ctx.userId)
        .get();
      const inviterData = inviterSnap.data() as {
        email?: string;
        displayName?: string;
      } | null;
      const inviterEmail = inviterData?.email?.toLowerCase().trim();

      if (inviterEmail === normalizedEmail) {
        return NextResponse.json(
          { error: "You cannot invite yourself to the workspace" },
          { status: 400 }
        );
      }

      // ── Already a member check ──────────────────────────────────
      const workspaceSnap = await getAdminDb()
        .collection("workspaces")
        .doc(ctx.workspaceId)
        .get();
      const workspaceData = workspaceSnap.data() as {
        name?: string;
        memberIds?: string[];
      } | null;
      const workspaceName = workspaceData?.name || "Unknown Workspace";
      const memberIds = workspaceData?.memberIds || [];

      if (memberIds.length > 0) {
        // Query users collection to find if any member has this email
        const existingUsers = await getAdminDb()
          .collection("users")
          .where("email", "==", normalizedEmail)
          .limit(1)
          .get();

        if (!existingUsers.empty) {
          const existingUserId = existingUsers.docs[0].id;
          if (memberIds.includes(existingUserId)) {
            return NextResponse.json(
              {
                error:
                  "This person is already a member of your workspace",
                code: "already_member",
              },
              { status: 409 }
            );
          }
        }
      }

      // ── Duplicate pending invite check ──────────────────────────
      const existingPending = await getAdminDb()
        .collection(INVITES_COLLECTION)
        .where("workspaceId", "==", ctx.workspaceId)
        .where("email", "==", normalizedEmail)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingPending.empty) {
        const existing = existingPending.docs[0];
        const existingData = existing.data() as { expiresAt: Timestamp };

        // If expired beyond its natural lifecycle, allow re-sending
        if (existingData.expiresAt.toDate() > new Date()) {
          return NextResponse.json(
            {
              error:
                "An invitation has already been sent to this email. " +
                "You can resend it from the pending invites list.",
              code: "duplicate_pending",
              existingInviteId: existing.id,
            },
            { status: 409 }
          );
        }
      }

      // ── Max pending invites limit ───────────────────────────────
      const pendingCountSnap = await getAdminDb()
        .collection(INVITES_COLLECTION)
        .where("workspaceId", "==", ctx.workspaceId)
        .where("status", "==", "pending")
        .count()
        .get();
      const pendingCount = pendingCountSnap.data().count;

      if (pendingCount >= MAX_PENDING_INVITES) {
        return NextResponse.json(
          {
            error: `Your workspace has reached the limit of ${MAX_PENDING_INVITES} pending invitations. Cancel older invites before inviting new members.`,
            code: "max_pending_reached",
          },
          { status: 429 }
        );
      }

      // ── Role validation ─────────────────────────────────────────
      const inviteRole: "admin" | "member" | "viewer" =
        role === "admin" ? "admin" : role === "viewer" ? "viewer" : "member";

      // ── Create invite document ──────────────────────────────────
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const inviteDoc = await getAdminDb()
        .collection(INVITES_COLLECTION)
        .add({
          workspaceId: ctx.workspaceId,
          email: normalizedEmail,
          invitedBy: ctx.userId,
          role: inviteRole,
          status: "pending",
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.now(),
        });
      const inviteId = inviteDoc.id;

      // ── Send invitation email ──────────────────────────────────
      const inviterName = inviterData?.displayName || "A team member";

      const baseUrl = getBaseUrl();
      const acceptUrl = `${baseUrl}/invite/accept?inviteId=${inviteId}`;
      const html = renderInviteEmail({
        inviterName,
        workspaceName,
        inviteRole,
        acceptUrl,
      });

      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const result = await resend.emails.send({
            from: `${process.env.FROM_NAME || "LeadFlow CRM"} <${process.env.FROM_EMAIL || "noreply@leadflow.app"}>`,
            to: normalizedEmail,
            subject: `Join ${workspaceName} on LeadFlow CRM`,
            html,
          });

          if (result.error) {
            console.error("Resend error:", result.error);
          } else {
            emailSent = true;
          }
        } catch (err) {
          console.error("Failed to send invite email:", err);
        }
      } else {
        console.warn("RESEND_API_KEY not configured - invite created without email");
      }

      return NextResponse.json({
        success: true,
        inviteId,
        emailSent,
      });
    } catch (error) {
      console.error("Invite error:", error);
      return NextResponse.json(
        { error: "Failed to invite member" },
        { status: 500 }
      );
    }
  });
}
