import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { getTrackingPixelGif } from "@/lib/email-tracking";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAILS_COLLECTION = "emails";
const EMAIL_EVENTS_COLLECTION = "email_events";

function pixelResponse(): NextResponse {
  const gifBuffer = Buffer.from(getTrackingPixelGif(), "binary");
  return new NextResponse(gifBuffer, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params;

    // Rate limit: max 100 opens per email per minute (anti-abuse)
    const ip = getClientIp(req);
    if (!checkRateLimit(`open:${emailId}`, 100, 60_000)) {
      return pixelResponse();
    }
    if (!checkRateLimit(`open:ip:${ip}`, 1000, 60_000)) {
      return pixelResponse();
    }

    const db = getAdminDb();
    const emailRef = db.collection(EMAILS_COLLECTION).doc(emailId);
    const emailSnap = await emailRef.get();

    if (emailSnap.exists) {
      const emailData = emailSnap.data() as {
        leadId?: string;
        workspaceId?: string;
      };

      // Fire-and-forget - don't block the pixel response
      db.collection(EMAIL_EVENTS_COLLECTION)
        .add({
          emailId,
          leadId: emailData.leadId || "",
          workspaceId: emailData.workspaceId || "",
          type: "open",
          ipAddress: ip,
          userAgent: req.headers.get("user-agent") || undefined,
          timestamp: Timestamp.now(),
        })
        .catch((err: unknown) => console.error("Failed to log email open event:", err));
    }

    return pixelResponse();
  } catch (err) {
    console.error("Email open tracking error:", err);
    return pixelResponse();
  }
}
