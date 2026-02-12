/**
 * Firestore: gyms/{gymId}/wods/{wodId} and gyms/{gymId}/wods/{wodId}/scores/{uid}
 * One leaderboard per WOD = the scores subcollection, filtered by division and ordered by value.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Wod, WodWithId, WodScore, WodScoreWithId, WodDivision, WodScoreType, WodDefaultTrack } from "@/types";

const WODS_COLLECTION = "wods";
const SCORES_COLLECTION = "scores";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function wodPath(gymId: string) {
  return collection(db, "gyms", gymId, WODS_COLLECTION);
}

function wodDoc(gymId: string, wodId: string) {
  return doc(db, "gyms", gymId, WODS_COLLECTION, wodId);
}

function scoresPath(gymId: string, wodId: string) {
  return collection(db, "gyms", gymId, WODS_COLLECTION, wodId, SCORES_COLLECTION);
}

function scoreDoc(gymId: string, wodId: string, uid: string) {
  return doc(db, "gyms", gymId, WODS_COLLECTION, wodId, SCORES_COLLECTION, uid);
}

function toWodWithId(gymId: string, id: string, d: Record<string, unknown>): WodWithId {
  const description = (d.description as string) ?? undefined;
  const descriptionRx = (d.descriptionRx as string) ?? undefined;
  const descriptionScaled = (d.descriptionScaled as string) ?? undefined;
  return {
    id,
    gymId,
    title: (d.title as string) ?? "",
    description,
    descriptionRx: descriptionRx ?? (description || undefined),
    descriptionScaled: descriptionScaled ?? undefined,
    defaultTrack: (d.defaultTrack as WodDefaultTrack) ?? "rx",
    wodDate: (d.wodDate as string) ?? undefined,
    scoreType: (d.scoreType as WodScoreType) ?? "reps",
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    createdByUid: (d.createdByUid as string) ?? "",
    isPublished: (d.isPublished as boolean) ?? false,
    eventId: d.eventId != null && d.eventId !== "" ? (d.eventId as string) : null,
  };
}

function toWodScoreWithId(id: string, d: Record<string, unknown>): WodScoreWithId {
  return {
    id,
    uid: (d.uid as string) ?? id,
    displayName: (d.displayName as string) ?? "",
    firstName: (d.firstName as string) ?? undefined,
    lastName: (d.lastName as string) ?? undefined,
    division: (d.division as WodDivision) ?? "men_rx",
    value: typeof d.value === "number" ? d.value : 0,
    valueRaw: (d.valueRaw as string) ?? undefined,
    completedWithinTimeCap:
      d.completedWithinTimeCap === true ? true : d.completedWithinTimeCap === false ? false : undefined,
    caption: (d.caption as string) ?? undefined,
    photoStoragePath: (d.photoStoragePath as string) ?? undefined,
    photoUrl: (d.photoUrl as string) ?? undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getWod(gymId: string, wodId: string): Promise<WodWithId | null> {
  const ref = wodDoc(gymId, wodId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toWodWithId(gymId, snap.id, snap.data());
}

/** Published WODs for a gym, newest first. Requires composite index: wods, isPublished ASC, createdAt DESC. */
export async function getPublishedWodsByGym(gymId: string, limitCount = 50): Promise<WodWithId[]> {
  const ref = wodPath(gymId);
  try {
    const q = query(
      ref,
      where("isPublished", "==", true),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toWodWithId(gymId, d.id, d.data()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("index") || msg.includes("requires an index")) {
      const qFallback = query(ref, where("isPublished", "==", true), limit(limitCount));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toWodWithId(gymId, d.id, d.data()));
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

/** All WODs for a gym (organizer view). */
export async function getAllWodsByGym(gymId: string, limitCount = 100): Promise<WodWithId[]> {
  const ref = wodPath(gymId);
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toWodWithId(gymId, d.id, d.data()));
}

export async function createWod(gymId: string, data: Omit<Wod, "createdAt">): Promise<string> {
  const ref = wodPath(gymId);
  const payload = {
    title: data.title,
    description: data.description ?? null,
    wodDate: data.wodDate ?? null,
    scoreType: data.scoreType,
    createdByUid: data.createdByUid,
    isPublished: data.isPublished ?? false,
    eventId: data.eventId ?? null,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function updateWod(
  gymId: string,
  wodId: string,
  data: Partial<Pick<Wod, "title" | "description" | "descriptionRx" | "descriptionScaled" | "defaultTrack" | "wodDate" | "scoreType" | "isPublished" | "eventId">>
): Promise<void> {
  const ref = wodDoc(gymId, wodId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() } as Record<string, unknown>);
}

/** Supprime un WOD et tous ses scores. Irréversible. */
export async function deleteWod(gymId: string, wodId: string): Promise<void> {
  const scoresRef = scoresPath(gymId, wodId);
  const snap = await getDocs(scoresRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  const wodRef = wodDoc(gymId, wodId);
  await deleteDoc(wodRef);
}

/** Get athlete's score for a WOD (doc id = uid). One score per athlete per WOD. */
export async function getWodScore(
  gymId: string,
  wodId: string,
  uid: string
): Promise<WodScoreWithId | null> {
  const ref = scoreDoc(gymId, wodId, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toWodScoreWithId(snap.id, snap.data());
}

/** Submit or update score. Doc id = uid to enforce one score per WOD. Preserves createdAt on update. */
export async function setWodScore(
  gymId: string,
  wodId: string,
  uid: string,
  data: {
    displayName: string;
    firstName?: string;
    lastName?: string;
    division: WodDivision;
    value: number;
    valueRaw?: string;
    completedWithinTimeCap?: boolean;
    caption?: string;
    photoStoragePath?: string;
    photoUrl?: string;
  }
): Promise<void> {
  const ref = scoreDoc(gymId, wodId, uid);
  const now = serverTimestamp();
  const snap = await getDoc(ref);
  const payload: Record<string, unknown> = {
    displayName: data.displayName,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    division: data.division,
    value: data.value,
    valueRaw: data.valueRaw ?? null,
    updatedAt: now,
  };
  if (data.completedWithinTimeCap !== undefined) payload.completedWithinTimeCap = data.completedWithinTimeCap;
  if (data.caption !== undefined) payload.caption = data.caption ?? null;
  if (data.photoStoragePath !== undefined) payload.photoStoragePath = data.photoStoragePath ?? null;
  if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl ?? null;
  if (snap.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, {
      uid,
      ...payload,
      createdAt: now,
    });
  }
}

/** Sort for "reps" with time cap: completed first (score = time, lower better), then not completed (score = reps, higher better). Legacy (no flag) = completed. */
function sortRepsWithTimeCap(scores: WodScoreWithId[]): void {
  scores.sort((a, b) => {
    const aCompleted = a.completedWithinTimeCap === true;
    const bCompleted = b.completedWithinTimeCap === true;
    if (aCompleted !== bCompleted) return aCompleted ? -1 : 1;
    if (aCompleted) return a.value - b.value;
    return b.value - a.value;
  });
}

/** Leaderboard: top N scores for WOD + division. time: orderBy value asc; reps/weight: orderBy value desc. Reps with time cap: in-memory sort. */
export async function getWodLeaderboard(
  gymId: string,
  wodId: string,
  division: WodDivision,
  scoreType: WodScoreType,
  topN: number,
  order: "asc" | "desc"
): Promise<WodScoreWithId[]> {
  const ref = scoresPath(gymId, wodId);
  if (scoreType === "reps" || scoreType === "time") {
    const q = query(ref, where("division", "==", division), limit(500));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
    sortRepsWithTimeCap(list);
    return list.slice(0, topN);
  }
  try {
    const q = query(
      ref,
      where("division", "==", division),
      orderBy("value", order),
      limit(topN)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("index") || msg.includes("requires an index")) {
      const qFallback = query(ref, where("division", "==", division), limit(topN * 2));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
      list.sort((a, b) => (order === "asc" ? a.value - b.value : b.value - a.value));
      return list.slice(0, topN);
    }
    throw err;
  }
}

/** Leaderboard toutes divisions : tous les scores du WOD, triés du meilleur au moins bon. */
export async function getWodLeaderboardAllDivisions(
  gymId: string,
  wodId: string,
  scoreType: WodScoreType,
  topN: number
): Promise<WodScoreWithId[]> {
  return getWodLeaderboardByTrack(gymId, wodId, "all", scoreType, topN);
}

/** Filtre leaderboard WOD : "all" | "rx" | "scaled" pour time/reps ; "all" | "men" | "women" pour weight. */
export type WodLeaderboardTrack = "all" | "rx" | "scaled" | "men" | "women";

const RX_DIVISIONS: WodDivision[] = ["men_rx", "women_rx"];
const SCALED_DIVISIONS: WodDivision[] = ["men_scaled", "women_scaled"];
const MEN_DIVISIONS: WodDivision[] = ["men_rx", "men_scaled"];
const WOMEN_DIVISIONS: WodDivision[] = ["women_rx", "women_scaled"];

export async function getWodLeaderboardByTrack(
  gymId: string,
  wodId: string,
  track: WodLeaderboardTrack,
  scoreType: WodScoreType,
  topN: number
): Promise<WodScoreWithId[]> {
  const ref = scoresPath(gymId, wodId);
  let list: WodScoreWithId[];
  if (track === "all") {
    const q = query(ref, limit(500));
    const snap = await getDocs(q);
    list = snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
  } else {
    const divisions =
      track === "rx" ? RX_DIVISIONS
      : track === "scaled" ? SCALED_DIVISIONS
      : track === "men" ? MEN_DIVISIONS
      : WOMEN_DIVISIONS;
    const q = query(ref, where("division", "in", divisions), limit(500));
    const snap = await getDocs(q);
    list = snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
  }
  if (scoreType === "reps" || scoreType === "time") {
    sortRepsWithTimeCap(list);
  } else {
    list.sort((a, b) => b.value - a.value);
  }
  return list.slice(0, topN);
}

/** Get my rank: for reps with time cap uses same sort and position; otherwise count better than myValue. */
export async function getMyRank(
  gymId: string,
  wodId: string,
  division: WodDivision,
  scoreType: WodScoreType,
  myScore: { uid: string; value: number; completedWithinTimeCap?: boolean }
): Promise<number> {
  const ref = scoresPath(gymId, wodId);
  const q = query(ref, where("division", "==", division));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => toWodScoreWithId(d.id, d.data()));
  if (scoreType === "reps" || scoreType === "time") {
    sortRepsWithTimeCap(all);
    const idx = all.findIndex((s) => s.uid === myScore.uid);
    return idx === -1 ? 0 : idx + 1;
  }
  all.sort((a, b) => b.value - a.value);
  const idx = all.findIndex((s) => s.uid === myScore.uid);
  return idx === -1 ? 0 : idx + 1;
}
