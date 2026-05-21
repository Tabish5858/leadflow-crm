import { NextRequest, NextResponse } from "next/server";
import { BrevoClient } from "@getbrevo/brevo";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@leadflow.app";
const FROM_NAME = process.env.FROM_NAME || "LeadFlow CRM";

export async function POST(req: NextRequest) {
  if (!BREVO_API_KEY) {
    return NextResponse.json(
      { error: "Brevo API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { to, subject, html, text, leadId, workspaceId } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: "to, subject, and html/text are required" },
        { status: 400 }
      );
    }

    const client = new BrevoClient({ apiKey: BREVO_API_KEY });

    const result = await client.transactionalEmails.sendTransacEmail({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html || text,
      textContent: text || html?.replace(/<[^>]*>/g, ""),
      headers: {
        "X-LeadFlow-Lead-Id": leadId || "",
        "X-LeadFlow-Workspace-Id": workspaceId || "",
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Brevo email error:", error);
    const message = error.message || error.toString() || "Failed to send email";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
