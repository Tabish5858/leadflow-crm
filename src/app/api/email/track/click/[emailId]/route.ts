import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAILS_COLLECTION = "emails";
const EMAIL_EVENTS_COLLECTION = "email_events";
const ALLOWED_SCHEMES = ["http:", "https:"];

function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) return false;
    // Block bare IP addresses (common phishing)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) return false;
    // Block internal/system hosts
    const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google.internal"];
    if (blocked.includes(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params;
    const urlParam = req.nextUrl.searchParams.get("url");

    if (!urlParam) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const targetUrl = decodeURIComponent(urlParam);

    // Validate URL to prevent open redirect
    if (!isValidRedirectUrl(targetUrl)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Rate limit: max 50 clicks per email per 5 minutes (anti-abuse)
    const ip = getClientIp(req);
    if (!checkRateLimit(`click:${emailId}`, 50, 300_000)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const emailRef = getAdminDb().collection(EMAILS_COLLECTION).doc(emailId);
    const emailSnap = await emailRef.get();

    if (emailSnap.exists) {
      const emailData = emailSnap.data() as {
        leadId?: string;
        workspaceId?: string;
      };

      await getAdminDb().collection(EMAIL_EVENTS_COLLECTION).add({
        emailId,
        leadId: emailData.leadId || "",
        workspaceId: emailData.workspaceId || "",
        type: "click",
        url: targetUrl,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || undefined,
        timestamp: Timestamp.now(),
      });
    }

    return NextResponse.redirect(targetUrl, 302);
  } catch (err) {
    console.error("Email click tracking error:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
