import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;

/**
 * Ensures the Firebase Admin app is initialized (idempotent).
 * Used by both getAdminDb() and getAdminAuth().
 */
function ensureAdminApp(): void {
  if (getApps().length > 0) return;

  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    throw new Error(
      "Firebase Admin SDK requires FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY env vars"
    );
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

  initializeApp({
    projectId,
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

/**
 * Lazy initializer for Firestore Admin SDK.
 * Only initializes when actually called, not at module import time.
 * This prevents build failures on CI where env vars may not be set.
 */
export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  ensureAdminApp();
  _adminDb = getFirestore(getApps()[0]);
  return _adminDb;
}

/**
 * Lazy initializer for Firebase Auth Admin SDK.
 * Ensures the Admin app is initialized first, then returns cached Auth instance.
 * Fixes cold-start bug where getAuth() was called before initializeApp().
 */
export function getAdminAuth(): Auth {
  if (_adminAuth) return _adminAuth;
  ensureAdminApp();
  _adminAuth = getAuth(getApps()[0]);
  return _adminAuth;
}
