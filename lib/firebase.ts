/**
 * Champ Firebase – single initialization point.
 * Import auth, db, storage from here everywhere; do not call initializeApp elsewhere.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

/** Callable: backfill gym feed from existing WOD scores (Daily WODs only). */
export async function backfillGymFeed(gymId: string): Promise<{ postsCreated: number }> {
  const fn = httpsCallable<{ gymId: string }, { success: boolean; postsCreated: number }>(functions, "backfillGymFeed");
  const res = await fn({ gymId });
  const data = res.data;
  if (!data?.success) throw new Error("Erreur lors de l’actualisation du fil.");
  return { postsCreated: data.postsCreated };
}

/** Callable: backfill gym feed from ROOT collection scores (gymId match, no eventId). */
export async function backfillFeedFromRootScores(gymId: string): Promise<{ postsCreated: number }> {
  const fn = httpsCallable<{ gymId: string }, { success: boolean; postsCreated: number }>(functions, "backfillFeedFromRootScores");
  const res = await fn({ gymId });
  const data = res.data;
  if (!data?.success) throw new Error("Erreur lors de l'actualisation du fil.");
  return { postsCreated: data.postsCreated };
}
