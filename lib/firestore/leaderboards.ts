/**
 * Firestore helpers: /leaderboards/{leaderboardId}
 * Uniqueness: one leaderboard per (workoutId + division). Find before create.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Leaderboard, LeaderboardWithId, Division } from "@/types";

const COLLECTION = "leaderboards";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toLeaderboardWithId(id: string, d: Record<string, unknown>): LeaderboardWithId {
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    eventId: d.eventId != null && d.eventId !== "" ? (d.eventId as string) : null,
    workoutId: d.workoutId != null && d.workoutId !== "" ? (d.workoutId as string) : null,
    division: d.division != null && d.division !== "" ? (d.division as Division) : null,
    isPublic: (d.isPublic as boolean) ?? true,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getLeaderboard(
  leaderboardId: string
): Promise<LeaderboardWithId | null> {
  const ref = doc(db, COLLECTION, leaderboardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toLeaderboardWithId(snap.id, snap.data());
}

/** Event-level leaderboard: one per event (workoutId and division null). Categories are filters in UI. */
export async function getLeaderboardByEvent(
  eventId: string
): Promise<LeaderboardWithId | null> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("eventId", "==", eventId),
    where("workoutId", "==", null),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toLeaderboardWithId(snap.docs[0].id, snap.docs[0].data());
}

/** Get or create the single leaderboard for an event. Returns its id. */
export async function getOrCreateEventLeaderboard(
  eventId: string,
  gymId: string,
  isPublic: boolean
): Promise<string> {
  const existing = await getLeaderboardByEvent(eventId);
  if (existing) return existing.id;
  return createLeaderboard({
    gymId,
    eventId,
    workoutId: null,
    division: null,
    isPublic,
  });
}

/** Find leaderboard by workout + division (at most one). Used for gym WODs (non-event). */
export async function getLeaderboardByWorkoutAndDivision(
  workoutId: string,
  division: Division
): Promise<LeaderboardWithId | null> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("workoutId", "==", workoutId),
    where("division", "==", division),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toLeaderboardWithId(snap.docs[0].id, snap.docs[0].data());
}

export async function getLeaderboardsByEvent(
  eventId: string
): Promise<LeaderboardWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("eventId", "==", eventId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toLeaderboardWithId(d.id, d.data()));
}

export async function getLeaderboardsByWorkout(
  workoutId: string
): Promise<LeaderboardWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("workoutId", "==", workoutId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toLeaderboardWithId(d.id, d.data()));
}

export async function createLeaderboard(
  data: Omit<Leaderboard, "createdAt" | "updatedAt">
): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    gymId: data.gymId,
    eventId: data.eventId ?? null,
    workoutId: data.workoutId ?? null,
    division: data.division ?? null,
    isPublic: data.isPublic,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

const DIVISIONS: Division[] = ["M_RX", "M_SCALED", "F_RX", "F_SCALED"];

/**
 * Event: one leaderboard per event (categories = filters). Gym WOD: one leaderboard per (workout, division).
 */
export async function createLeaderboardsForWorkout(
  gymId: string,
  eventId: string | null,
  workoutId: string,
  isPublic: boolean
): Promise<string[]> {
  if (eventId != null && eventId !== "") {
    const id = await getOrCreateEventLeaderboard(eventId, gymId, isPublic);
    return [id];
  }
  const ids: string[] = [];
  for (const division of DIVISIONS) {
    const existing = await getLeaderboardByWorkoutAndDivision(workoutId, division);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = await createLeaderboard({
      gymId,
      eventId: null,
      workoutId,
      division,
      isPublic,
    });
    ids.push(id);
  }
  return ids;
}
