import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  Contract,
  ContractStatus,
  ContractTemplate,
  ContractSigner,
  ContractActivity,
} from "@/types";

const CONTRACTS_COLLECTION = "contracts";
const TEMPLATES_COLLECTION = "contract_templates";

// ─── Demo Mode ───────────────────────────────────────────────────────────────

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): Timestamp {
  return Timestamp.now();
}

// ─── Create Contract ─────────────────────────────────────────────────────────

export async function createContract(
  workspaceId: string,
  data: {
    contractTitle: string;
    type: "contract" | "proposal";
    content?: string;
    clientId?: string | null;
    projectId?: string | null;
    signers?: ContractSigner[];
  }
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createContract(workspaceId, data);
  }

  const ref = collection(db, CONTRACTS_COLLECTION);
  const docRef = await addDoc(ref, {
    workspaceId,
    contractTitle: data.contractTitle,
    type: data.type || "contract",
    status: "draft" as ContractStatus,
    content: data.content || "",
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    signers: data.signers || [],
    activities: [
      {
        type: "created",
        userId: "",
        userName: "System",
        timestamp: now(),
      },
    ],
    attachments: [],
    signatures: [],
    dateSent: null,
    dateSigned: null,
    createdBy: "",
    createdAt: now(),
    updatedAt: now(),
  });

  return docRef.id;
}

// ─── Update Contract ─────────────────────────────────────────────────────────

export async function updateContract(
  contractId: string,
  data: Partial<Contract>
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateContract(contractId, data);
    return;
  }

  const ref = doc(db, CONTRACTS_COLLECTION, contractId);
  await updateDoc(ref, {
    ...data,
    updatedAt: now(),
  });
}

// ─── Get Contract ────────────────────────────────────────────────────────────

export async function getContract(id: string): Promise<Contract | null> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getContract(id);
  }

  const snap = await getDoc(doc(db, CONTRACTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Contract;
}

// ─── List Contracts ──────────────────────────────────────────────────────────

export async function getContracts(
  workspaceId: string,
  opts?: {
    max?: number;
    status?: ContractStatus;
    clientId?: string;
    projectId?: string;
  }
): Promise<Contract[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    let docs = demoStore.getContracts().filter((d) => d.workspaceId === workspaceId);
    if (opts?.status) docs = docs.filter((d) => d.status === opts.status);
    if (opts?.clientId) docs = docs.filter((d) => d.clientId === opts.clientId);
    if (opts?.projectId) docs = docs.filter((d) => d.projectId === opts.projectId);
    return docs;
  }

  const conditions = [where("workspaceId", "==", workspaceId)];
  if (opts?.status) conditions.push(where("status", "==", opts.status));
  if (opts?.clientId) conditions.push(where("clientId", "==", opts.clientId));
  if (opts?.projectId) conditions.push(where("projectId", "==", opts.projectId));

  const q = query(
    collection(db, CONTRACTS_COLLECTION),
    ...conditions,
    orderBy("createdAt", "desc"),
    ...(opts?.max ? [limit(opts.max)] : [])
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contract);
}

// ─── Delete Contract ─────────────────────────────────────────────────────────

export async function deleteContract(
  contractId: string
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.deleteContract(contractId);
    return;
  }

  await deleteDoc(doc(db, CONTRACTS_COLLECTION, contractId));
}

// ─── Contract Status Transitions ─────────────────────────────────────────────

export async function sendContract(
  contractId: string,
  opts?: { userId?: string; userName?: string }
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateContract(contractId, {
      status: "sent",
      dateSent: now(),
    });
    return;
  }

  // Get current contract to merge signers + activities
  const contract = await getContract(contractId);
  if (!contract) throw new Error("Contract not found");

  const existingSigners = contract.signers || [];
  const ownerName = opts?.userName || "Owner";
  const ownerId = opts?.userId || "owner";

  // Add owner as a signed signer if not already present
  const ownerExists = existingSigners.some((s) => s.id === ownerId);
  const updatedSigners = ownerExists
    ? existingSigners.map((s) =>
        s.id === ownerId ? { ...s, status: "signed" as const, signedAt: now() } : s
      )
    : [
        {
          id: ownerId,
          email: "",
          name: ownerName,
          title: "Owner",
          type: "owner" as const,
          status: "signed" as const,
          required: false,
          signedAt: now(),
        } as ContractSigner,
        ...existingSigners,
      ];

  // Record activity
  const activities = [
    ...(contract.activities || []),
    {
      type: "sent" as const,
      userId: ownerId,
      userName: ownerName,
      timestamp: now(),
      details: `Sent by ${ownerName}`,
    },
  ];

  const ref = doc(db, CONTRACTS_COLLECTION, contractId);
  await updateDoc(ref, {
    status: "sent",
    dateSent: now(),
    signers: updatedSigners,
    activities,
    updatedAt: now(),
  });
}

export async function signContract(
  contractId: string,
  signerId: string,
  signature: string
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.signContract(contractId, signerId, signature);
    return;
  }

  const contract = await getContract(contractId);
  if (!contract) throw new Error("Contract not found");

  const updatedSigners = contract.signers.map((s) =>
    s.id === signerId
      ? { ...s, status: "signed" as const, signedAt: now() }
      : s
  );

  const signedSigner = contract.signers.find((s) => s.id === signerId);
  const signerName = signedSigner?.name || signerId;

  const activities = [
    ...(contract.activities || []),
    {
      type: "signed" as const,
      userId: signerId,
      userName: signerName,
      timestamp: now(),
      details: `Signed by ${signerName}`,
    },
  ];

  const allSigned = updatedSigners.every((s) => s.status === "signed");
  const updates: Partial<Contract> & Record<string, unknown> = {
    signers: updatedSigners,
    signatures: [
      ...(contract.signatures || []),
      { signer: signerId, signature, signedAt: now() },
    ],
    activities,
    updatedAt: now(),
  };

  if (allSigned) {
    updates.status = "signed";
    updates.dateSigned = now();
  }

  const ref = doc(db, CONTRACTS_COLLECTION, contractId);
  await updateDoc(ref, updates);
}

export async function rejectContract(
  contractId: string,
  reason?: string,
  opts?: { userId?: string; userName?: string }
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateContract(contractId, { status: "rejected" });
    return;
  }

  const contract = await getContract(contractId);

  const activities = contract?.activities
    ? [
        ...contract.activities,
        {
          type: "rejected" as const,
          userId: opts?.userId || "",
          userName: opts?.userName || "Unknown",
          timestamp: now(),
          details: reason || `Rejected by ${opts?.userName || "Unknown"}`,
        },
      ]
    : [];

  const ref = doc(db, CONTRACTS_COLLECTION, contractId);
  await updateDoc(ref, {
    status: "rejected",
    activities,
    updatedAt: now(),
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function createTemplate(
  workspaceId: string,
  data: {
    templateTitle: string;
    templateDescription?: string;
    type: "contract" | "proposal";
    content?: string;
  }
): Promise<string> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.createTemplate(workspaceId, data);
  }

  const ref = collection(db, TEMPLATES_COLLECTION);
  const docRef = await addDoc(ref, {
    workspaceId,
    templateTitle: data.templateTitle,
    templateDescription: data.templateDescription || "",
    type: data.type || "contract",
    content: data.content || "",
    status: "draft" as ContractStatus,
    createdAt: now(),
    updatedAt: now(),
  });

  return docRef.id;
}

export async function getTemplates(
  workspaceId: string
): Promise<ContractTemplate[]> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getTemplates().filter((t) => t.workspaceId === workspaceId);
  }

  const q = query(
    collection(db, TEMPLATES_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContractTemplate);
}

export async function getTemplate(id: string): Promise<ContractTemplate | null> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    return demoStore.getTemplate(id);
  }

  const snap = await getDoc(doc(db, TEMPLATES_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ContractTemplate;
}

export async function updateTemplate(
  templateId: string,
  data: Partial<ContractTemplate>
): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.updateTemplate(templateId, data);
    return;
  }

  const ref = doc(db, TEMPLATES_COLLECTION, templateId);
  await updateDoc(ref, {
    ...data,
    updatedAt: now(),
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/demo-data");
    demoStore.deleteTemplate(templateId);
    return;
  }

  await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
}

// ─── Convert contract to template ────────────────────────────────────────────

export async function convertContractToTemplate(
  contractId: string,
  workspaceId: string
): Promise<string> {
  const contract = await getContract(contractId);
  if (!contract) throw new Error("Contract not found");

  return createTemplate(workspaceId, {
    templateTitle: contract.contractTitle,
    templateDescription: `Converted from contract: ${contract.contractTitle}`,
    type: contract.type,
    content: contract.content,
  });
}
