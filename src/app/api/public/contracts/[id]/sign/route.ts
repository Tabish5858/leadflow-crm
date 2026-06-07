import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

const CONTRACTS_COLLECTION = "contracts";

// In-memory rate limiting for public sign endpoint (prevents brute force)
const signRateLimit = new Map<string, { count: number; reset: number }>();
const MAX_SIGN_ATTEMPTS = 5;
const SIGN_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkSignRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = signRateLimit.get(key);
  if (!entry || now > entry.reset) {
    signRateLimit.set(key, { count: 1, reset: now + SIGN_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_SIGN_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limiting by IP + contract ID
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}:sign:${id}`;
    if (!checkSignRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Too many sign attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { signerId, signature, token } = body;

    if (!id || !signerId || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: contractId, signerId, signature" },
        { status: 400 }
      );
    }

    // Validate signature is a string with reasonable length (prevent blob injection)
    if (typeof signature !== "string" || signature.length > 5000) {
      return NextResponse.json(
        { error: "Invalid signature data" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection(CONTRACTS_COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const rawData = docSnap.data() as Record<string, unknown>;
    const contractStatus = rawData.status as string | undefined;

    // Only allow signing for sent contracts
    if (contractStatus !== "sent" && contractStatus !== "signed") {
      return NextResponse.json(
        { error: "Contract is not available for signing" },
        { status: 403 }
      );
    }

    const rawSigners = (rawData.signers as Array<Record<string, unknown>>) || [];
    const signerIndex = rawSigners.findIndex((s) => s.id === signerId);

    if (signerIndex === -1) {
      return NextResponse.json(
        { error: "Signer not found on this contract" },
        { status: 404 }
      );
    }

    // Verify signing token if present (strong auth), otherwise allow but log
    const signerToken = rawSigners[signerIndex].signToken as string | undefined;
    if (signerToken && token !== signerToken) {
      return NextResponse.json(
        { error: "Invalid signing token. Please use the link from your email." },
        { status: 403 }
      );
    }

    if (rawSigners[signerIndex].status === "signed") {
      return NextResponse.json(
        { error: "Signer has already signed" },
        { status: 409 }
      );
    }

    // Update signer status
    rawSigners[signerIndex].status = "signed";
    rawSigners[signerIndex].signedAt = Timestamp.now();
    rawSigners[signerIndex].selectedFields = {
      ...((rawSigners[signerIndex].selectedFields as Record<string, unknown>) || {}),
      signature,
    };

    // Add to signatures array
    const rawSignatures = (rawData.signatures as Array<Record<string, unknown>>) || [];
    const signatures = [
      ...rawSignatures,
      {
        signer: signerId,
        signature,
        signedAt: Timestamp.now(),
      },
    ];

    // Check if all signers have signed
    const allSigned = rawSigners.every((s) => s.status === "signed");
    const updateData: Record<string, unknown> = {
      signers: rawSigners,
      signatures,
      updatedAt: Timestamp.now(),
    };

    if (allSigned) {
      updateData.status = "signed";
      updateData.dateSigned = Timestamp.now();
    }

    // Add activity
    const rawActivities = (rawData.activities as Array<Record<string, unknown>>) || [];
    const activities = [
      ...rawActivities,
      {
        type: "signed",
        userId: signerId,
        userName: rawSigners[signerIndex].name || "Signer",
        timestamp: Timestamp.now(),
        details: `Signed by ${rawSigners[signerIndex].email as string}`,
      },
    ];
    updateData.activities = activities;

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      status: allSigned ? "signed" : "partial",
    });
  } catch (error) {
    console.error("Public sign error:", error);
    return NextResponse.json(
      { error: "Failed to sign contract" },
      { status: 500 }
    );
  }
}
