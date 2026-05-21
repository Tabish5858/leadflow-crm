import { NextRequest, NextResponse } from "next/server";
import { BrevoClient } from "@getbrevo/brevo";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@leadflow.app";
const FROM_NAME = process.env.FROM_NAME || "LeadFlow CRM";

export async function GET() {
  return NextResponse.json({
    message: "Brevo test endpoint. POST with { to: 'your@email.com' } to send a test email.",
    configured: !!BREVO_API_KEY,
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME,
    provider: "Brevo",
  });
}

export async function POST(req: NextRequest) {
  if (!BREVO_API_KEY) {
    return NextResponse.json(
      { status: "error", message: "Brevo API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const to = body.to || FROM_EMAIL;

    const client = new BrevoClient({ apiKey: BREVO_API_KEY });

    const result = await client.transactionalEmails.sendTransacEmail({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to }],
      subject: "LeadFlow — Brevo Connection Test",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Brevo Connection Test</h2>
          <p>If you received this email, your Brevo API key is configured correctly.</p>
          <p style="color: #6b7280; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br/>
            From: ${FROM_NAME} &lt;${FROM_EMAIL}&gt;<br/>
            To: ${to}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      status: "success",
      message: "Test email sent successfully via Brevo",
      messageId: result.messageId,
      to,
      from: FROM_EMAIL,
      provider: "Brevo",
    });
  } catch (error: any) {
    console.error("Brevo test error:", error);
    const message = error.message || error.toString() || "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
