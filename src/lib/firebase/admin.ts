import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app =
  getApps().length === 0
    ? initializeApp({
        projectId: firebaseAdminConfig.projectId,
        credential: firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey
          ? cert({
              projectId: firebaseAdminConfig.projectId,
              clientEmail: firebaseAdminConfig.clientEmail,
              privateKey: firebaseAdminConfig.privateKey,
            })
          : undefined,
      })
    : getApps()[0];

const adminDb = getFirestore(app);

export { adminDb };
