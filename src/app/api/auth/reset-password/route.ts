import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";

const RESET_TOKENS_COLLECTION = "password_reset_tokens";

/**
 * POST /api/auth/reset-password
 *
 * Accepts a valid reset token and a new password.
 * Verifies the token, looks up the user in Firebase Auth, updates the password,
 * and marks the token as used.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find the token in Firestore
    const snap = await getAdminDb()
      .collection(RESET_TOKENS_COLLECTION)
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const expiresAt = data.expiresAt?.toDate();

    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Update the password via Firebase Admin SDK
    if (!data.uid) {
      return NextResponse.json(
        { error: "User account not found for this reset link." },
        { status: 400 }
      );
    }

    try {
      await getAdminAuth().updateUser(data.uid, { password: newPassword });
    } catch (err: unknown) {
      console.error("Failed to update password:", err);
      return NextResponse.json(
        { error: "Failed to reset password. The link may have expired." },
        { status: 500 }
      );
    }

    // Mark token as used
    await docSnap.ref.update({ used: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
