import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { addTrackingPixel, rewriteLinks } from "@/lib/email-tracking";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@leadflow.app";
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

    if (enableTracking && leadId && workspaceId) {
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
        trackingEnabled: true,
      });

      const emailId = docRef.id;

      if (processedHtml) {
        if (trackClicks !== false) {
          processedHtml = rewriteLinks(processedHtml, emailId, baseUrl);
        }
        if (trackOpens !== false) {
          processedHtml = addTrackingPixel(processedHtml, emailId, baseUrl);
        }
      }

      const result = await resend.emails.send({
        from: `LeadFlow <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: processedHtml,
        text: processedText,
        headers: {
          "X-LeadFlow-Lead-Id": leadId || "",
          "X-LeadFlow-Workspace-Id": workspaceId || "",
          "X-LeadFlow-Email-Id": emailId,
        },
      });

      if (result.error) {
        console.error("Resend API error:", result.error);
        return NextResponse.json(
          { error: result.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        emailId,
        resendId: result.data?.id,
      });
    }

    const result = await resend.emails.send({
      from: `LeadFlow <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: processedHtml,
      text: processedText,
      headers: {
        "X-LeadFlow-Lead-Id": leadId || "",
        "X-LeadFlow-Workspace-Id": workspaceId || "",
      },
    });

    if (result.error) {
      console.error("Resend API error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

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
        resendId: result.data?.id,
        trackingEnabled: false,
      });

      return NextResponse.json({
        success: true,
        emailId: docRef.id,
        resendId: result.data?.id,
      });
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
