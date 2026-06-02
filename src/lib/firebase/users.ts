import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export interface UpdateUserProfileData {
  displayName?: string;
  photoURL?: string | null;
}

/**
 * Update the current user's profile in Firestore and optionally in Firebase Auth.
 *
 * @param userId - The Firestore user document ID (same as Firebase Auth UID).
 * @param data - Fields to update on the user document.
 */
export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileData
): Promise<void> {
  const userRef = doc(db, "users", userId);

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }

  if (data.photoURL !== undefined) {
    updateData.photoURL = data.photoURL;
  }

  await updateDoc(userRef, updateData);

  // Sync the display name to Firebase Auth so it's available on re-login
  if (data.displayName !== undefined && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
      });
    } catch {
      // Non-critical - Firestore is the source of truth
    }
  }
}
