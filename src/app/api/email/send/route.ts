import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { addTrackingPixel, rewriteLinks } from "@/lib/email-tracking";

const resend = new Resend(process.env.RESEND_API_KEY);
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
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Resend API key not configured" },
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
        createdBy: createdBy || "system",
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

    // Send via Resend
    const recipients = Array.isArray(to) ? to : [to];
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipients,
      subject,
      html: processedHtml || processedText,
      text: processedText,
      headers: {
        "X-LeadFlow-Lead-Id": leadId || "",
        "X-LeadFlow-Workspace-Id": workspaceId || "",
      ...(emailId ? { "X-LeadFlow-Email-Id": emailId } : {})},
    });

    if (result.error) {
      console.error("Resend email error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    // Update Firestore record with Resend ID
    if (emailId && result.data?.id) {
      const { doc, updateDoc } = await import("firebase/firestore");
      try {
        await updateDoc(doc(db, EMAILS_COLLECTION, emailId), {
          resendId: result.data.id,
        });
      } catch {
        // Non-critical — log but don't fail
        console.warn("Failed to update email record with resendId");
      }
    }

    return NextResponse.json({
      success: true,
      emailId,
      resendId: result.data?.id,
    });
  } catch (error) {
    console.error("Email send error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
