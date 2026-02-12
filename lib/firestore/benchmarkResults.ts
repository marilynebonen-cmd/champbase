/**
 * Firestore helpers: users/{uid}/benchmark_results/{id}
 * CRUD for athlete benchmark results (subcollection under user).
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
import type {
  BenchmarkResult,
  BenchmarkResultWithId,
  BenchmarkTrack,
  BenchmarkScoreType,
  BenchmarkResultUnit,
} from "@/types";

const USERS_COLLECTION = "users";
const SUBCOLLECTION = "benchmark_results";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toResultWithId(id: string, d: Record<string, unknown>): BenchmarkResultWithId {
  return {
    id,
    benchmarkId: (d.benchmarkId as string) ?? "",
    track: (d.track as BenchmarkTrack) ?? "rx",
    scoreType: (d.scoreType as BenchmarkScoreType) ?? "custom",
    timeSeconds: d.timeSeconds != null ? (d.timeSeconds as number) : null,
    reps: d.reps != null ? (d.reps as number) : null,
    weight: d.weight != null ? (d.weight as number) : null,
    unit: (d.unit as BenchmarkResultUnit | null) ?? null,
    completedWithinTimeCap: d.completedWithinTimeCap != null ? (d.completedWithinTimeCap as boolean) : null,
    performedAt: toDate(d.performedAt as Timestamp) ?? new Date(),
    note: (d.note as string | null) ?? null,
    isPublic: d.isPublic === false ? false : true,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

function resultsRef(uid: string) {
  return collection(db, USERS_COLLECTION, uid, SUBCOLLECTION);
}

export type AddBenchmarkResultInput = Omit<BenchmarkResult, "createdAt" | "updatedAt">;

export async function addBenchmarkResult(
  userId: string,
  data: AddBenchmarkResultInput
): Promise<string> {
  const payload: Record<string, unknown> = {
    benchmarkId: data.benchmarkId,
    track: data.track,
    scoreType: data.scoreType,
    timeSeconds: data.timeSeconds ?? null,
    reps: data.reps ?? null,
    weight: data.weight ?? null,
    unit: data.unit ?? null,
    completedWithinTimeCap: data.completedWithinTimeCap ?? null,
    performedAt: data.performedAt instanceof Date ? data.performedAt : data.performedAt,
    note: data.note ?? null,
    isPublic: data.isPublic !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = resultsRef(userId);
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function listBenchmarkResultsForUser(
  userId: string,
  benchmarkId: string
): Promise<BenchmarkResultWithId[]> {
  const ref = resultsRef(userId);
  const q = query(
    ref,
    where("benchmarkId", "==", benchmarkId),
    orderBy("performedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toResultWithId(d.id, d.data()));
}

export async function getBenchmarkResult(
  userId: string,
  resultId: string
): Promise<BenchmarkResultWithId | null> {
  const ref = doc(db, USERS_COLLECTION, userId, SUBCOLLECTION, resultId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toResultWithId(snap.id, snap.data());
}

const RESULT_EDIT_FIELDS = [
  "track", "scoreType", "timeSeconds", "reps", "weight", "unit",
  "completedWithinTimeCap", "performedAt", "note", "isPublic",
] as const;

export async function updateBenchmarkResult(
  userId: string,
  resultId: string,
  data: Partial<Pick<BenchmarkResult, (typeof RESULT_EDIT_FIELDS)[number]>>
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, userId, SUBCOLLECTION, resultId);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const key of RESULT_EDIT_FIELDS) {
    if (key in data && data[key as keyof typeof data] !== undefined) {
      (payload as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key] ?? null;
    }
  }
  await updateDoc(ref, payload);
}

export async function deleteBenchmarkResult(userId: string, resultId: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, userId, SUBCOLLECTION, resultId);
  await deleteDoc(ref);
}

/** Update only isPublic (visibility). Optimistic UI + toast. */
export async function updateBenchmarkVisibility(
  userId: string,
  resultId: string,
  isPublic: boolean
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, userId, SUBCOLLECTION, resultId);
  await updateDoc(ref, {
    isPublic,
    updatedAt: serverTimestamp(),
  });
}

/** List all results for a user where isPublic == true (for public profile view). */
export async function listPublicBenchmarkResultsForUser(
  userId: string
): Promise<BenchmarkResultWithId[]> {
  const ref = resultsRef(userId);
  const q = query(
    ref,
    where("isPublic", "==", true),
    orderBy("performedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toResultWithId(d.id, d.data()));
}

/**
 * List ALL benchmark results for a user (owner only – used to fix visibility).
 * Firestore rules allow read only when request.auth.uid == uid.
 */
export async function listAllBenchmarkResultsForUser(
  userId: string
): Promise<BenchmarkResultWithId[]> {
  const ref = resultsRef(userId);
  const q = query(ref, orderBy("performedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toResultWithId(d.id, d.data()));
}

/** List most recently updated results (for mobile "4 latest" preview). limit default 4. */
export async function listRecentBenchmarkResultsForUser(
  userId: string,
  limitCount = 4
): Promise<BenchmarkResultWithId[]> {
  const ref = resultsRef(userId);
  const q = query(
    ref,
    orderBy("updatedAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toResultWithId(d.id, d.data()));
}
