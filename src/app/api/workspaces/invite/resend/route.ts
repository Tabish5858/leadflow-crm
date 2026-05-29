import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { renderInviteEmail } from "@/lib/email-templates";

const INVITES_COLLECTION = "workspace_invites";

// In-memory rate limiter for resend (per-invite, per-workspace)
const resendCooldowns = new Map<string, number>();
const RESEND_COOLDOWN_MS = 30_000; // 30 seconds

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * POST /api/workspaces/invite/resend
 *
 * Re-sends an existing pending invitation email.
 * Refreshes the expiry date and enforces a 30-second cooldown.
 *
 * Headers: x-user-id, x-workspace-id
 * Body: { inviteId: string }
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await req.json();
      const { inviteId } = body;

      if (!inviteId || typeof inviteId !== "string") {
        return NextResponse.json(
          { error: "inviteId is required" },
          { status: 400 }
        );
      }

      // ── Rate limiting (per inviteId + workspaceId) ──────────────
      const rateLimitKey = `${ctx.workspaceId}:${inviteId}`;
      const lastSent = resendCooldowns.get(rateLimitKey);
      const now = Date.now();

      if (lastSent && now - lastSent < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (now - lastSent)) / 1000
        );
        return NextResponse.json(
          {
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before resending again`,
            code: "resend_cooldown",
            retryAfterSeconds: remainingSeconds,
          },
          { status: 429 }
        );
      }

      const db = getAdminDb();
      const inviteRef = db.collection(INVITES_COLLECTION).doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }

      const invite = inviteSnap.data() as {
        workspaceId: string;
        email: string;
        role: "admin" | "member" | "viewer";
        status: string;
      };

      // Must belong to this workspace
      if (invite.workspaceId !== ctx.workspaceId) {
        return NextResponse.json(
          { error: "Invitation does not belong to this workspace" },
          { status: 403 }
        );
      }

      // Only pending invites can be resent
      if (invite.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending invitations can be resent" },
          { status: 400 }
        );
      }

      // ── Refresh expiry date ────────────────────────────────────
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await inviteRef.update({
        expiresAt: Timestamp.fromDate(expiresAt),
        invitedBy: ctx.userId, // track who last resent
      });

      // ── Get workspace + inviter info ────────────────────────────
      const [workspaceSnap, userSnap] = await Promise.all([
        db.collection("workspaces").doc(ctx.workspaceId).get(),
        db.collection("users").doc(ctx.userId).get(),
      ]);

      const workspaceName =
        (workspaceSnap.data() as { name?: string })?.name ||
        "Unknown Workspace";

      const userData = userSnap.data() as { displayName?: string } | null;
      const inviterName = userData?.displayName || "A team member";

      // ── Send email ─────────────────────────────────────────────
      const baseUrl = getBaseUrl();
      const acceptUrl = `${baseUrl}/invite/accept?inviteId=${inviteId}`;
      const html = renderInviteEmail({
        inviterName,
        workspaceName,
        inviteRole: invite.role,
        acceptUrl,
      });

      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const result = await resend.emails.send({
            from: `${process.env.FROM_NAME || "LeadFlow CRM"} <${process.env.FROM_EMAIL || "noreply@leadflow.app"}>`,
            to: invite.email,
            subject: `Reminder: Join ${workspaceName} on LeadFlow CRM`,
            html,
          });

          if (result.error) {
            console.error("Resend error:", result.error);
          } else {
            emailSent = true;
            // Set cooldown only on successful email send
            resendCooldowns.set(rateLimitKey, now);
          }
        } catch (err) {
          console.error("Failed to resend invite email:", err);
        }
      } else {
        console.warn("RESEND_API_KEY not configured");
      }

      return NextResponse.json({
        success: true,
        inviteId,
        emailSent,
      });
    } catch (error) {
      console.error("Resend invite error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to resend invitation",
        },
        { status: 500 }
      );
    }
  });
}
