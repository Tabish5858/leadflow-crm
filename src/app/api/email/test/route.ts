import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@leadflow.app";

/**
 * Test endpoint to verify Resend API is working.
 * POST /api/email/test with { to: "your@email.com" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = body.to || FROM_EMAIL;

    const result = await resend.emails.send({
      from: `LeadFlow <${FROM_EMAIL}>`,
      to: [to],
      subject: "LeadFlow — Resend Connection Test",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Resend Connection Test</h2>
          <p>If you received this email, your Resend API key is configured correctly.</p>
          <p style="color: #6b7280; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br/>
            From: ${FROM_EMAIL}<br/>
            To: ${to}
          </p>
        </div>
      `,
    });

    if (result.error) {
      return NextResponse.json(
        { status: "error", message: result.error.message, details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Test email sent successfully",
      emailId: result.data?.id,
      to,
      from: FROM_EMAIL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Resend test endpoint. POST with { to: 'your@email.com' } to send a test email.",
    configured: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || "noreply@leadflow.app",
  });
}
