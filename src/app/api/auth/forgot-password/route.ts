import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

const RESET_TOKENS_COLLECTION = "password_reset_tokens";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a self-managed password reset token, stores it in Firestore
 * with a 1-hour expiry, and sends a branded email via Resend containing
 * a link to our own /reset-password page.
 *
 * No Firebase email action handler involved — the email comes from our
 * own domain via Resend, so it won't land in spam.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find the user by email in Firebase Auth (Admin SDK)
    // so we can verify the account exists
    let uid: string | null = null;
    try {
      const userRecord = await getAdminAuth().getUserByEmail(normalizedEmail);
      uid = userRecord.uid;
    } catch (err: unknown) {
      // If user not found in Firebase Auth, still send a generic response
      // to avoid revealing whether the email exists (security best practice)
      console.warn(
        "Password reset requested for non-existent or error email:",
        err instanceof Error ? err.message : "unknown",
      );
    }

    // Generate a secure random token
    const crypto = await import("node:crypto");
    const token = crypto.randomBytes(32).toString("hex");

    // Store in Firestore with expiry (1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await getAdminDb()
      .collection(RESET_TOKENS_COLLECTION)
      .add({
        email: normalizedEmail,
        uid,
        token,
        used: false,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

    // Build reset link
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Build branded HTML email
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LeadFlow";
    const fromEmail = process.env.FROM_EMAIL || "noreply@leadflow.app";
    const fromName = process.env.FROM_NAME || "LeadFlow CRM";

    const html = `<!DOCTYPE html>
  <html lang="en">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
  <tr><td style="padding:28px 32px 0;text-align:left;">
  <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${appName}</p>
  </td></tr>
  <tr><td style="padding:20px 32px 28px;">
  <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a;">Password reset</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.5;">
  We received a request to reset the password for your ${appName} account. Use the button below to continue.
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="border-radius:6px;background:#1e293b;">
  <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Reset password</a>
  </td></tr>
  </table>
  <p style="margin:18px 0 0;font-size:13px;color:#64748b;line-height:1.4;">
  If you did not request this change, you can ignore this email.
  </p>
  <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;">
  This link expires in 1 hour. If the button does not work, copy and paste this URL into your browser:<br>
  <a href="${resetUrl}" style="color:#1e293b;word-break:break-all;">${resetUrl}</a>
  </p>
  </td></tr>
  <tr><td style="padding:16px 32px;text-align:left;background:#f8fafc;border-top:1px solid #e2e8f0;">
  <p style="margin:0;font-size:12px;color:#94a3b8;">
  ${appName} CRM
  </p>
  </td></tr>
  </table>
  </td></tr>
  </table>
  </body>
  </html>`;

    // Send via Resend
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email sending is not configured. Contact your administrator." },
        { status: 500 },
      );
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: normalizedEmail,
      subject: `Reset your ${appName} password`,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Always return success even if user doesn't exist (security — don't reveal account existence)
    return NextResponse.json({
      success: true,
      sentBy: "resend",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to send reset email. Please try again later." },
      { status: 500 },
    );
  }
}
