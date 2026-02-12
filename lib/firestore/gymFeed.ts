/**
 * Firestore: gyms/{gymId}/feed/{scoreId}
 * One feed doc per gym daily WOD score. Created/updated when athlete submits or updates a score (root /scores).
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GymFeedDoc, GymFeedDocWithId } from "@/types";

const FEED_COLLECTION = "feed";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function feedPath(gymId: string) {
  return collection(db, "gyms", gymId, FEED_COLLECTION);
}

function feedDoc(gymId: string, scoreId: string) {
  return doc(db, "gyms", gymId, FEED_COLLECTION, scoreId);
}

function toGymFeedDocWithId(id: string, d: Record<string, unknown>): GymFeedDocWithId {
  const trophiesRaw = d.trophies;
  const trophies: Record<string, true> =
    trophiesRaw && typeof trophiesRaw === "object" && !Array.isArray(trophiesRaw)
      ? (trophiesRaw as Record<string, true>)
      : {};
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    workoutId: (d.workoutId as string) ?? "",
    scoreId: (d.scoreId as string) ?? id,
    athleteUid: (d.athleteUid as string) ?? "",
    athleteName: (d.athleteName as string) ?? "",
    athletePhotoUrl: d.athletePhotoUrl != null && d.athletePhotoUrl !== "" ? (d.athletePhotoUrl as string) : undefined,
    division: (d.division as string) ?? "",
    scoreType: (d.scoreType as string) ?? "",
    scoreValue: (d.scoreValue as string) ?? "",
    comment: d.comment != null && d.comment !== "" ? (d.comment as string) : undefined,
    photoUrl: d.photoUrl != null && d.photoUrl !== "" ? (d.photoUrl as string) : undefined,
    workoutName: (d.workoutName as string) ?? undefined,
    trophies: Object.keys(trophies).length > 0 ? trophies : undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
  };
}

export type SetGymFeedDocData = {
  gymId: string;
  workoutId: string;
  scoreId: string;
  athleteUid: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
  division: string;
  scoreType: string;
  scoreValue: string;
  comment?: string | null;
  photoUrl?: string | null;
  workoutName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** Create or update a feed doc (merge: true). Only for gym daily WOD (non-event). */
export async function setGymFeedDoc(
  gymId: string,
  scoreId: string,
  data: SetGymFeedDocData
): Promise<void> {
  const ref = feedDoc(gymId, scoreId);
  const payload: Record<string, unknown> = {
    gymId: data.gymId,
    scoreId: data.scoreId,
    workoutId: data.workoutId,
    athleteUid: data.athleteUid,
    athleteName: data.athleteName,
    athletePhotoUrl: data.athletePhotoUrl ?? null,
    division: data.division,
    scoreType: data.scoreType,
    scoreValue: data.scoreValue,
    comment: data.comment ?? null,
    photoUrl: data.photoUrl ?? null,
    workoutName: data.workoutName ?? null,
    createdAt: data.createdAt ?? serverTimestamp(),
    updatedAt: data.updatedAt ?? serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
}

/**
 * Toggle trophy for the current user on a feed post.
 * One trophy per user: if user already in trophies → remove; else → add.
 */
export async function toggleTrophy(
  gymId: string,
  feedId: string,
  userId: string
): Promise<void> {
  const ref = feedDoc(gymId, feedId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const trophies: Record<string, true> =
    data.trophies && typeof data.trophies === "object" && !Array.isArray(data.trophies)
      ? { ...(data.trophies as Record<string, true>) }
      : {};
  if (trophies[userId]) {
    delete trophies[userId];
  } else {
    trophies[userId] = true;
  }
  await updateDoc(ref, { trophies });
}

/** Delete a feed doc (e.g. when athlete deletes their score). Allowed by rules only when athleteUid == request.auth.uid. */
export async function deleteGymFeedDoc(gymId: string, scoreId: string): Promise<void> {
  const ref = feedDoc(gymId, scoreId);
  await deleteDoc(ref);
}

/** One-time fetch: feed page ordered by createdAt desc. */
export async function getGymFeedPage(
  gymId: string,
  pageSize: number,
  startAfterDoc?: DocumentSnapshot
): Promise<{ items: GymFeedDocWithId[]; lastVisible: DocumentSnapshot | null }> {
  const ref = feedPath(gymId);
  const q = startAfterDoc
    ? query(
        ref,
        orderBy("createdAt", "desc"),
        startAfter(startAfterDoc),
        limit(pageSize)
      )
    : query(ref, orderBy("createdAt", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toGymFeedDocWithId(d.id, d.data()));
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastVisible };
}

/** Real-time listener: first page of gym feed, orderBy createdAt desc. */
export function subscribeGymFeed(
  gymId: string,
  pageSize: number,
  callback: (items: GymFeedDocWithId[], lastVisible: DocumentSnapshot | null) => void
): Unsubscribe {
  const pathHint = `gyms/${gymId}/feed`;
  const queryInfo = { collection: FEED_COLLECTION, gymId, orderBy: "createdAt desc", limit: pageSize };
  const ref = feedPath(gymId);
  const q = query(ref, orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => toGymFeedDocWithId(d.id, d.data()));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      callback(items, lastVisible);
    },
    (err) => {
      console.error("[FEED SNAPSHOT ERROR]", err.code, err.message);
    }
  );
}
