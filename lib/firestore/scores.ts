/**
 * Firestore helpers: /scores/{scoreId}
 * Athletes submit own scores (online); judges submit for athletes (live).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Score, ScoreWithId, Division, SubmissionType, ScoreType } from "@/types";

const COLLECTION = "scores";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toScoreWithId(id: string, d: Record<string, unknown>): ScoreWithId {
  const eventId = d.eventId != null && d.eventId !== "" ? (d.eventId as string) : null;
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    isEventScore: typeof d.isEventScore === "boolean" ? d.isEventScore : !!eventId,
    eventId,
    leaderboardId: (d.leaderboardId as string) ?? "",
    workoutId: (d.workoutId as string) ?? "",
    athleteUid: (d.athleteUid as string) ?? "",
    athleteName: (d.athleteName as string) ?? "",
    division: (d.division as Division) ?? "M_RX",
    scoreType: (d.scoreType as ScoreType) ?? "REPS",
    scoreValue: (d.scoreValue as string) ?? "",
    submittedByUid: (d.submittedByUid as string) ?? "",
    submissionType: (d.submissionType as SubmissionType) ?? "athlete",
    comment: (d.comment as string) ?? undefined,
    photoUrl: (d.photoUrl as string) ?? undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
  };
}

export async function getScore(scoreId: string): Promise<ScoreWithId | null> {
  const ref = doc(db, COLLECTION, scoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toScoreWithId(snap.id, snap.data());
}

/** Scores for a leaderboard. Sorted by createdAt desc (MVP). TODO: advanced score sorting. */
export async function getScoresByLeaderboard(
  leaderboardId: string
): Promise<ScoreWithId[]> {
  if (!leaderboardId?.trim()) return [];
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("leaderboardId", "==", leaderboardId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => toScoreWithId(d.id, d.data()));
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return list;
}

/** Gym activity feed: scores where gymId == gymId, ordered by createdAt desc. Requires index: scores (gymId ASC, createdAt DESC). */
export async function getScoresByGym(
  gymId: string,
  pageSize: number,
  startAfterDoc?: DocumentSnapshot
): Promise<{ scores: ScoreWithId[]; lastVisible: DocumentSnapshot | null }> {
  if (!gymId?.trim()) return { scores: [], lastVisible: null };
  const ref = collection(db, COLLECTION);
  const q = startAfterDoc
    ? query(
        ref,
        where("gymId", "==", gymId),
        orderBy("createdAt", "desc"),
        startAfter(startAfterDoc),
        limit(pageSize)
      )
    : query(
        ref,
        where("gymId", "==", gymId),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
  const snap = await getDocs(q);
  const scores = snap.docs.map((d) => toScoreWithId(d.id, d.data()));
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { scores, lastVisible };
}

/** Real-time listener for gym feed (scores by gymId, newest first). */
export function subscribeScoresByGym(
  gymId: string,
  pageSize: number,
  callback: (scores: ScoreWithId[], lastVisible: DocumentSnapshot | null) => void
): Unsubscribe {
  if (!gymId?.trim()) {
    callback([], null);
    return () => {};
  }
  const pathHint = `scores (root)`;
  const queryInfo = { collection: COLLECTION, gymId, orderBy: "createdAt desc", limit: pageSize };
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("gymId", "==", gymId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => {
      const scores = snap.docs.map((d) => toScoreWithId(d.id, d.data()));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      callback(scores, lastVisible);
    },
    (err) => {
      console.error("[SNAPSHOT ERROR]", { pathHint, queryInfo, code: err.code, message: err.message });
    }
  );
}

export async function getScoresByAthlete(athleteUid: string): Promise<ScoreWithId[]> {
  if (!athleteUid?.trim()) return [];
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("athleteUid", "==", athleteUid));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => toScoreWithId(d.id, d.data()));
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return list;
}

export async function submitScore(data: Omit<Score, "createdAt">): Promise<string> {
  const ref = collection(db, COLLECTION);
  const payload: Record<string, unknown> = {
    gymId: data.gymId,
    isEventScore: data.isEventScore === true,
    eventId: data.eventId ?? null,
    leaderboardId: data.leaderboardId,
    workoutId: data.workoutId,
    athleteUid: data.athleteUid,
    athleteName: data.athleteName,
    division: data.division,
    scoreType: data.scoreType,
    scoreValue: data.scoreValue,
    submittedByUid: data.submittedByUid,
    submissionType: data.submissionType,
    createdAt: serverTimestamp(),
  };
  if (data.comment !== undefined) payload.comment = data.comment ?? null;
  if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl ?? null;
  payload.updatedAt = serverTimestamp();
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

/** Update an existing score (athlete own score only; enforced by rules). */
export async function updateScore(
  scoreId: string,
  data: Partial<Pick<Score, "scoreValue" | "athleteName" | "comment" | "photoUrl">>
): Promise<void> {
  const ref = doc(db, COLLECTION, scoreId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() } as Record<string, unknown>);
}

/** Delete a score by id (for testing / cleanup; rules must allow delete). */
export async function deleteScore(scoreId: string): Promise<void> {
  const ref = doc(db, COLLECTION, scoreId);
  await deleteDoc(ref);
}

/** Get existing score for athlete in a leaderboard (for edit / one-per-athlete check). */
export async function getScoreByLeaderboardAndAthlete(
  leaderboardId: string,
  athleteUid: string
): Promise<ScoreWithId | null> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("leaderboardId", "==", leaderboardId),
    where("athleteUid", "==", athleteUid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toScoreWithId(snap.docs[0].id, snap.docs[0].data());
}

/** For event leaderboard: one score per athlete per workout. */
export async function getScoreByLeaderboardWorkoutAndAthlete(
  leaderboardId: string,
  workoutId: string,
  athleteUid: string
): Promise<ScoreWithId | null> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("leaderboardId", "==", leaderboardId),
    where("workoutId", "==", workoutId),
    where("athleteUid", "==", athleteUid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toScoreWithId(snap.docs[0].id, snap.docs[0].data());
}

/** Real-time: listen to score changes for a leaderboard. Callback receives current scores; returns unsubscribe. */
export function onScoresByLeaderboard(
  leaderboardId: string,
  callback: (scores: ScoreWithId[]) => void
): Unsubscribe {
  if (!leaderboardId?.trim()) {
    callback([]);
    return () => {};
  }
  const pathHint = `scores (root)`;
  const queryInfo = { collection: COLLECTION, leaderboardId };
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("leaderboardId", "==", leaderboardId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => toScoreWithId(d.id, d.data()));
      list.sort((a, b) => {
        const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
      callback(list);
    },
    (err) => {
      console.error("[SNAPSHOT ERROR]", { pathHint, queryInfo, code: err.code, message: err.message });
    }
  );
}
