import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

const CONTRACTS_COLLECTION = "contracts";

// In-memory rate limiting for view tracking (prevents activity poisoning)
const viewRateLimit = new Map<string, { count: number; reset: number }>();
const MAX_VIEWS_PER_WINDOW = 10;
const VIEW_RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkViewRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = viewRateLimit.get(key);
  if (!entry || now > entry.reset) {
    viewRateLimit.set(key, { count: 1, reset: now + VIEW_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_VIEWS_PER_WINDOW) return false;
  entry.count++;
  return true;
}

// Sanitize a string input to prevent XSS and injection
function sanitize(input: string | null | undefined, maxLength: number): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[<>"'&]/g, "") // Strip HTML special chars
    .replace(/[\x00-\x1F\x7F]/g, "") // Strip control characters
    .slice(0, maxLength) // Enforce max length
    .trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    }

    // Rate limiting by IP + contract ID
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}:view:${id}`;
    if (!checkViewRateLimit(rateLimitKey)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Sanitize inputs to prevent XSS and activity poisoning
    const viewerEmail = sanitize(body.viewerEmail as string | null | undefined, 254);
    const viewerName = sanitize(body.viewerName as string | null | undefined, 100);

    const db = getAdminDb();
    const docRef = db.collection(CONTRACTS_COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Only track views for sent/signed contracts (not drafts)
    const contractStatus = docSnap.data()?.status as string | undefined;
    if (contractStatus !== "sent" && contractStatus !== "signed") {
      return NextResponse.json({ error: "Contract is not publicly accessible" }, { status: 403 });
    }

    // Cap activities array at 200 entries (prevent unlimited array growth / DoS)
    const existingActivities = (docSnap.data()?.activities as Array<Record<string, unknown>>) || [];
    const activities = existingActivities.slice(-199); // keep last 199, make room for 1 more

    activities.push({
      type: "viewed",
      userId: viewerEmail || "anonymous",
      userName: viewerName || "Anonymous",
      timestamp: Timestamp.now(),
      details: viewerEmail ? `Viewed by ${viewerEmail}` : "Viewed anonymously",
    });

    await docRef.update({
      activities,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("View tracking error:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 }
    );
  }
}
