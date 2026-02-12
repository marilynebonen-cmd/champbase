/**
 * Firestore helpers: /workouts/{workoutId}
 * Workouts can be EVENT (eventId set) or GYM (eventId null, gym WOD).
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
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Workout, WorkoutWithId, ScoreType, WorkoutScope } from "@/types";

const COLLECTION = "workouts";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toWorkoutWithId(id: string, d: Record<string, unknown>): WorkoutWithId {
  const eventId = d.eventId != null && d.eventId !== "" ? (d.eventId as string) : null;
  const workoutScope: WorkoutScope = eventId != null ? "EVENT" : "GYM";
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    eventId,
    workoutScope,
    name: (d.name as string) ?? "",
    description: (d.description as string) ?? undefined,
    scoreType: (d.scoreType as ScoreType) ?? "REPS",
    scoringNotes: (d.scoringNotes as string) ?? undefined,
    unit: (d.unit as string) ?? "reps",
    deadline: d.deadline != null ? toDate(d.deadline as Timestamp) ?? null : null,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getWorkout(workoutId: string): Promise<WorkoutWithId | null> {
  const ref = doc(db, COLLECTION, workoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toWorkoutWithId(snap.id, snap.data());
}

function isIndexError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
  return msg.includes("index") || msg.includes("requires an index") || code === "failed-precondition";
}

export async function getWorkoutsByEvent(eventId: string): Promise<WorkoutWithId[]> {
  const ref = collection(db, COLLECTION);
  try {
    const q = query(
      ref,
      where("eventId", "==", eventId),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toWorkoutWithId(d.id, d.data()));
  } catch (err) {
    if (isIndexError(err)) {
      const qFallback = query(ref, where("eventId", "==", eventId));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toWorkoutWithId(d.id, d.data()));
      list.sort((a, b) => {
        const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return ta - tb;
      });
      return list;
    }
    throw err;
  }
}

/** All workouts for a gym (event workouts and gym WODs). */
export async function getWorkoutsByGym(gymId: string): Promise<WorkoutWithId[]> {
  const ref = collection(db, COLLECTION);
  try {
    const q = query(
      ref,
      where("gymId", "==", gymId),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toWorkoutWithId(d.id, d.data()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("index") || msg.includes("requires an index")) {
      const qFallback = query(ref, where("gymId", "==", gymId), limit(100));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toWorkoutWithId(d.id, d.data()));
      list.sort((a, b) => {
        const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
      return list;
    }
    throw err;
  }
}

export async function createWorkout(data: Omit<Workout, "createdAt" | "updatedAt" | "workoutScope">): Promise<string> {
  const ref = collection(db, COLLECTION);
  const eventId = data.eventId ?? null;
  const docRef = await addDoc(ref, {
    gymId: data.gymId,
    eventId,
    name: data.name,
    description: data.description ?? null,
    scoreType: data.scoreType,
    scoringNotes: data.scoringNotes ?? null,
    unit: data.unit,
    deadline: data.deadline ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateWorkout(
  workoutId: string,
  data: Partial<Pick<Workout, "name" | "description" | "scoreType" | "scoringNotes" | "unit" | "deadline">>
): Promise<void> {
  const ref = doc(db, COLLECTION, workoutId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() } as Record<string, unknown>);
}

/** Delete a workout. Does not delete related leaderboards or scores (event has one leaderboard; scores keep leaderboardId). */
export async function deleteWorkout(workoutId: string): Promise<void> {
  const ref = doc(db, COLLECTION, workoutId);
  await deleteDoc(ref);
}
