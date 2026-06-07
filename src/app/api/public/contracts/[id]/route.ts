import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const CONTRACTS_COLLECTION = "contracts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection(CONTRACTS_COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const data = docSnap.data();

    // Only return public contracts (sent/signed status)
    if (data?.status !== "sent" && data?.status !== "signed") {
      return NextResponse.json({ error: "Contract is not publicly accessible" }, { status: 403 });
    }

    // Safe cast since we verified the doc exists
    const contract = data as Record<string, unknown>;
    const signersRaw = (contract.signers as Array<Record<string, unknown>>) || [];
    const signaturesRaw = (contract.signatures as Array<Record<string, unknown>>) || [];
    const dateSentRaw = contract.dateSent as { toMillis?: () => number | null } | null | undefined;
    const dateSignedRaw = contract.dateSigned as { toMillis?: () => number | null } | null | undefined;
    const createdAtRaw = contract.createdAt as { toMillis?: () => number | null } | null | undefined;

    // Return sanitized contract data (no internal fields)
    return NextResponse.json({
      success: true,
      contract: {
        id: docSnap.id,
        contractTitle: contract.contractTitle as string,
        type: contract.type as string,
        status: contract.status as string,
        content: contract.content as string,
        signers: signersRaw.map((s) => ({
          id: s.id as string,
          name: s.name as string,
          email: s.email as string,
          title: s.title as string,
          type: s.type as string,
          status: s.status as string,
          required: s.required as boolean,
          signedAt: (s.signedAt as { toMillis?: () => number | null })?.toMillis?.() || (s.signedAt as number | null) || null,
        })),
        signatures: signaturesRaw.map((sig) => ({
          signer: sig.signer as string,
          signature: sig.signature as string,
          signedAt: (sig.signedAt as { toMillis?: () => number | null })?.toMillis?.() || (sig.signedAt as number | null) || null,
        })),
        dateSent: dateSentRaw?.toMillis?.() || null,
        dateSigned: dateSignedRaw?.toMillis?.() || null,
        createdAt: createdAtRaw?.toMillis?.() || null,
      },
    });
  } catch (error) {
    console.error("Public contract fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}
