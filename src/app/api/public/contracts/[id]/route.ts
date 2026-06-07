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

    const contract = docSnap.data()!;

    // Only return public contracts (sent/signed status)
    if (contract.status !== "sent" && contract.status !== "signed") {
      return NextResponse.json({ error: "Contract is not publicly accessible" }, { status: 403 });
    }

    // Return sanitized contract data (no internal fields)
    return NextResponse.json({
      success: true,
      contract: {
        id: docSnap.id,
        contractTitle: contract.contractTitle,
        type: contract.type,
        status: contract.status,
        content: contract.content,
        signers: (contract.signers || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          title: s.title,
          type: s.type,
          status: s.status,
          required: s.required,
          signedAt: s.signedAt?.toMillis?.() || s.signedAt || null,
        })),
        signatures: (contract.signatures || []).map((sig: any) => ({
          signer: sig.signer,
          signature: sig.signature,
          signedAt: sig.signedAt?.toMillis?.() || sig.signedAt || null,
        })),
        dateSent: contract.dateSent?.toMillis?.() || null,
        dateSigned: contract.dateSigned?.toMillis?.() || null,
        createdAt: contract.createdAt?.toMillis?.() || null,
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
