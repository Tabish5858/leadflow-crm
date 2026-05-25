import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

let _adminDb: Firestore | null = null;

/**
 * Lazy initializer for Firestore Admin SDK.
 * Only initializes when actually called, not at module import time.
 * This prevents build failures on CI where env vars may not be set.
 */
export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;

  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    throw new Error(
      "Firebase Admin SDK requires FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY env vars"
    );
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

  const app =
    getApps().length === 0
      ? initializeApp({
          projectId,
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey,
          }),
        })
      : getApps()[0];

  _adminDb = getFirestore(app);
  return _adminDb;
}
