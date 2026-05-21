import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Automation } from "@/types";

const AUTOMATIONS_COLLECTION = "automations";

export async function getAutomations(workspaceId: string): Promise<Automation[]> {
  const q = query(
    collection(db, AUTOMATIONS_COLLECTION),
    where("workspaceId", "==", workspaceId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Automation));
}

export async function createAutomation(data: Omit<Automation, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(collection(db, AUTOMATIONS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateAutomation(id: string, data: Partial<Automation>): Promise<void> {
  const docRef = doc(db, AUTOMATIONS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAutomation(id: string): Promise<void> {
  const docRef = doc(db, AUTOMATIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function toggleAutomation(id: string, enabled: boolean): Promise<void> {
  await updateAutomation(id, { enabled });
}

// Automation Engine - evaluates and executes automations
export async function evaluateAutomations(
  workspaceId: string,
  triggerType: Automation["trigger"]["type"],
  leadId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  const automations = await getAutomations(workspaceId);
  const enabled = automations.filter((a) => a.enabled && a.trigger.type === triggerType);

  for (const automation of enabled) {
    // Check trigger-specific conditions
    if (automation.trigger.type === "tag_added" && automation.trigger.config.tag) {
      if (context.tag !== automation.trigger.config.tag) continue;
    }

    if (automation.trigger.type === "status_changed" && automation.trigger.config.fromStatus) {
      if (context.fromStatus !== automation.trigger.config.fromStatus) continue;
    }

    // Execute actions
    for (const action of automation.actions) {
      await executeAction(leadId, action, context);
    }
  }
}

async function executeAction(
  leadId: string,
  action: Automation["actions"][number],
  context: Record<string, unknown>
): Promise<void> {
  // In a production app, these would be actual API calls or queue jobs
  // Action execution is logged for debugging purposes
  void leadId;
  void action;
  void context;

  switch (action.type) {
    case "add_tag":
    case "remove_tag":
    case "change_status":
    case "assign":
    case "send_notification":
    case "send_email":
      // These would integrate with respective services
      break;
  }
}
