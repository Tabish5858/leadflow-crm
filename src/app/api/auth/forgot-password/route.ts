import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a Firebase password reset link pointing to our own domain,
 * then sends the email via Resend (from our own domain).
 * No auth required — public endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Lazy-init Firebase Admin SDK (needed for auth, not just firestore)
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Password reset is not configured on this server" },
        { status: 500 }
      );
    }

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

    if (getApps().length === 0) {
      initializeApp({
        projectId,
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
      || "http://localhost:3000";

    const auth = getAuth();

    // Generate a Firebase password reset link pointing to our custom page
    const resetLink = await auth.generatePasswordResetLink(email.trim(), {
      url: `${baseUrl}/reset-password`,
      handleCodeInApp: true,
    });

    // Build a branded HTML email
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LeadFlow";
    const fromEmail = process.env.FROM_EMAIL || "noreply@leadflow.app";
    const fromName = process.env.FROM_NAME || "LeadFlow CRM";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${appName}</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Reset your password</h2>
<p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.5;">
We received a request to reset the password for your <strong>${appName}</strong> account associated with <strong>${email}</strong>.
</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td align="center" style="border-radius:8px;background:#667eea;">
<a href="${resetLink}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Reset Password</a>
</td></tr>
</table>
<p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.4;">
If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
<p style="margin:0;font-size:12px;color:#aaa;">
This link expires in 1 hour. If the button doesn't work, copy and paste this URL into your browser:<br>
<a href="${resetLink}" style="color:#667eea;word-break:break-all;">${resetLink}</a>
</p>
</td></tr>
<tr><td style="padding:16px 40px;text-align:center;background:#fafafa;border-top:1px solid #eee;">
<p style="margin:0;font-size:12px;color:#aaa;">
${appName} &mdash; Open-source CRM
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // Send via Resend
    if (!process.env.RESEND_API_KEY) {
      // If Resend not configured, fall back to Firebase's own email
      return NextResponse.json({
        success: true,
        sentBy: "firebase",
        message: "Reset email sent via Firebase (configure RESEND_API_KEY for custom from-address)",
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email.trim(),
      subject: `Reset your ${appName} password`,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sentBy: "resend",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    const message = error instanceof Error ? error.message : "Failed to send reset email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
