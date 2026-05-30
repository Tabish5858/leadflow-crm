import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RESET_TOKENS_COLLECTION = "password_reset_tokens";

/**
 * GET /api/auth/verify-reset-token?token=xxx
 *
 * Verifies a password reset token is valid, not expired, and not used.
 * Returns the associated email on success.
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: max 30 token verifications per IP per minute (cost protection)
    const ip = getClientIp(req);
    if (!checkRateLimit(`verifytoken:${ip}`, 30, 60_000)) {
      return NextResponse.json(
        { valid: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const token = req.nextUrl.searchParams.get("token");

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const snap = await getAdminDb()
      .collection(RESET_TOKENS_COLLECTION)
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { valid: false, error: "This reset link is invalid or has already been used." },
        { status: 400 }
      );
    }

    const data = snap.docs[0].data();
    const expiresAt = data.expiresAt?.toDate();

    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: data.email,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify reset link." },
      { status: 500 }
    );
  }
}
