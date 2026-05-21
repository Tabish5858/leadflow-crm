import { NextRequest, NextResponse } from "next/server";
import { BrevoClient } from "@getbrevo/brevo";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { addTrackingPixel, rewriteLinks } from "@/lib/email-tracking";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@leadflow.app";
const FROM_NAME = process.env.FROM_NAME || "LeadFlow CRM";
const EMAILS_COLLECTION = "emails";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  if (!BREVO_API_KEY) {
    return NextResponse.json(
      { error: "Brevo API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { to, subject, html, text, leadId, workspaceId, createdBy, trackOpens, trackClicks } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: "to, subject, and html/text are required" },
        { status: 400 }
      );
    }

    const enableTracking = trackOpens !== false && trackClicks !== false;
    const baseUrl = getBaseUrl();

    let processedHtml = html || "";
    const processedText = text || html?.replace(/<[^>]*>/g, "") || "";

    // Create Firestore record first (needed for tracking IDs)
    let emailId = "";
    if (leadId && workspaceId) {
      const docRef = await addDoc(collection(db, EMAILS_COLLECTION), {
        workspaceId,
        leadId,
        to: Array.isArray(to) ? to[0] : to,
        subject,
        body: text || processedText,
        status: "sent",
        sentAt: Timestamp.now(),
        createdBy,
        createdAt: Timestamp.now(),
        trackingEnabled: enableTracking,
      });
      emailId = docRef.id;

      // Inject tracking pixel and rewrite links
      if (enableTracking && processedHtml) {
        if (trackClicks !== false) {
          processedHtml = rewriteLinks(processedHtml, emailId, baseUrl);
        }
        if (trackOpens !== false) {
          processedHtml = addTrackingPixel(processedHtml, emailId, baseUrl);
        }
      }
    }

    // Send via Brevo
    const client = new BrevoClient({ apiKey: BREVO_API_KEY });

    const headers: Record<string, string> = {
      "X-LeadFlow-Lead-Id": leadId || "",
      "X-LeadFlow-Workspace-Id": workspaceId || "",
    };
    if (emailId) {
      headers["X-LeadFlow-Email-Id"] = emailId;
    }

    const result = await client.transactionalEmails.sendTransacEmail({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: Array.isArray(to) ? to.map((e: string) => ({ email: e })) : [{ email: to }],
      subject,
      htmlContent: processedHtml || undefined,
      textContent: processedText || undefined,
      headers,
    });

    // Update Firestore record with Brevo message ID
    if (emailId) {
      // messageId is returned but we don't need to update — it's stored in the response
    }

    return NextResponse.json({
      success: true,
      emailId,
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
