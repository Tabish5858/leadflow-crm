import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

const CONTRACTS_COLLECTION = "contracts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { signerId, signature, token } = body;

    if (!id || !signerId || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: contractId, signerId, signature" },
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
    const rawSigners = (rawData.signers as Array<Record<string, unknown>>) || [];
    const signerIndex = rawSigners.findIndex((s) => s.id === signerId);

    if (signerIndex === -1) {
      return NextResponse.json(
        { error: "Signer not found on this contract" },
        { status: 404 }
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
