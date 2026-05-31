import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { renderClientInviteEmail } from "@/lib/email-templates";
import { checkRateLimit } from "@/lib/rate-limit";

const CLIENT_INVITES_COLLECTION = "client_invites";
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
 * POST /api/workspaces/clients/invite
 *
 * Creates a client invitation and sends an email with portal access link.
 * Only workspace owners and admins can invite clients.
 *
 * Headers: Authorization: Bearer <token>, x-workspace-id
 * Body: { email: string, message?: string }
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      // Only owner/admin can invite clients
      if (ctx.role !== "owner" && ctx.role !== "admin") {
        return NextResponse.json(
          { error: "Only workspace owners and admins can invite clients" },
          { status: 403 }
        );
      }

      // Rate limiting: max 10 invites per workspace per minute
      if (!checkRateLimit(`client-invite:${ctx.workspaceId}`, 10, 60_000)) {
        return NextResponse.json(
          {
            error: "Too many invitations. Please slow down.",
            code: "rate_limited",
          },
          { status: 429 }
        );
      }

      const body = await req.json();
      const { email, message } = body;

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

      // Optional message validation
      if (message && (typeof message !== "string" || message.length > 500)) {
        return NextResponse.json(
          { error: "Personal message must be under 500 characters" },
          { status: 400 }
        );
      }

      // ── Self-invite prevention ──────────────────────────────────
      const db = getAdminDb();
      const inviterSnap = await db
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
          { error: "You cannot invite yourself as a client" },
          { status: 400 }
        );
      }

      // ── Already a member check ──────────────────────────────────
      const workspaceSnap = await db
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
        const existingUsers = await db
          .collection("users")
          .where("email", "==", normalizedEmail)
          .limit(1)
          .get();

        if (!existingUsers.empty) {
          const existingUserId = existingUsers.docs[0].id;
          if (memberIds.includes(existingUserId)) {
            // Check if they're already a client
            const existingUserData = existingUsers.docs[0].data();
            const existingRole =
              existingUserData.workspaceRoles?.[ctx.workspaceId] ||
              existingUserData.role;
            if (existingRole === "client") {
              return NextResponse.json(
                {
                  error: "This person is already a client of your workspace",
                  code: "already_client",
                },
                { status: 409 }
              );
            }
            return NextResponse.json(
              {
                error: "This person is already a member of your workspace",
                code: "already_member",
              },
              { status: 409 }
            );
          }
        }
      }

      // ── Duplicate pending invite check ──────────────────────────
      const existingPending = await db
        .collection(CLIENT_INVITES_COLLECTION)
        .where("workspaceId", "==", ctx.workspaceId)
        .where("email", "==", normalizedEmail)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingPending.empty) {
        const existing = existingPending.docs[0];
        const existingData = existing.data() as { expiresAt: Timestamp };

        if (existingData.expiresAt.toDate() > new Date()) {
          return NextResponse.json(
            {
              error:
                "A client invitation has already been sent to this email. " +
                "You can resend it from the pending invites list.",
              code: "duplicate_pending",
              existingInviteId: existing.id,
            },
            { status: 409 }
          );
        }
      }

      // ── Max pending invites limit ───────────────────────────────
      const pendingCountSnap = await db
        .collection(CLIENT_INVITES_COLLECTION)
        .where("workspaceId", "==", ctx.workspaceId)
        .where("status", "==", "pending")
        .count()
        .get();
      const pendingCount = pendingCountSnap.data().count;

      if (pendingCount >= MAX_PENDING_INVITES) {
        return NextResponse.json(
          {
            error: `Your workspace has reached the limit of ${MAX_PENDING_INVITES} pending client invitations. Cancel older invites first.`,
            code: "max_pending_reached",
          },
          { status: 429 }
        );
      }

      // ── Create invite document ──────────────────────────────────
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const inviteDoc = await db
        .collection(CLIENT_INVITES_COLLECTION)
        .add({
          workspaceId: ctx.workspaceId,
          email: normalizedEmail,
          invitedBy: ctx.userId,
          role: "client",
          status: "pending",
          message: message || null,
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.now(),
        });
      const inviteId = inviteDoc.id;

      // ── Send invitation email ──────────────────────────────────
      const inviterName = inviterData?.displayName || "A team member";

      const baseUrl = getBaseUrl();
      const acceptUrl = `${baseUrl}/client/auth/accept?token=${inviteId}`;
      const html = renderClientInviteEmail({
        inviterName,
        workspaceName,
        acceptUrl,
        message: message || undefined,
      });

      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const result = await resend.emails.send({
            from: `${process.env.FROM_NAME || "LeadFlow CRM"} <${process.env.FROM_EMAIL || "noreply@leadflow.app"}>`,
            to: normalizedEmail,
            subject: `Access the ${workspaceName} client portal`,
            html,
          });

          if (result.error) {
            console.error("Resend error:", result.error);
          } else {
            emailSent = true;
          }
        } catch (err) {
          console.error("Failed to send client invite email:", err);
        }
      } else {
        console.warn("RESEND_API_KEY not configured — invite created without email");
      }

      return NextResponse.json({
        success: true,
        inviteId,
        emailSent,
      });
    } catch (error) {
      console.error("Client invite error:", error);
      return NextResponse.json(
        { error: "Failed to send client invitation" },
        { status: 500 }
      );
    }
  });
}
