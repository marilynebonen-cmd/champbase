/**
 * Firestore helpers: /events/{eventId}
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
import type { Event, EventWithId, EventType, EventStatus } from "@/types";

const COLLECTION = "events";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toEventWithId(id: string, d: Record<string, unknown>): EventWithId {
  const status = (d.status as EventStatus) ?? "draft";
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    title: (d.title as string) ?? "",
    description: (d.description as string) ?? undefined,
    imageUrl: (d.imageUrl as string) ?? undefined,
    type: (d.type as EventType) ?? "online",
    status,
    isPublic: status === "published",
    startDate: toDate(d.startDate as Timestamp) ?? new Date(),
    endDate: toDate(d.endDate as Timestamp) ?? new Date(),
    createdByUid: (d.createdByUid as string) ?? "",
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getEvent(eventId: string): Promise<EventWithId | null> {
  const ref = doc(db, COLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toEventWithId(snap.id, snap.data());
}

function isIndexError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
  return msg.includes("index") || msg.includes("requires an index") || code === "failed-precondition";
}

/** Published events only (status === "published") for public listing. */
export async function getPublishedEvents(): Promise<EventWithId[]> {
  const ref = collection(db, COLLECTION);
  try {
    const q = query(
      ref,
      where("status", "==", "published"),
      orderBy("startDate", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toEventWithId(d.id, d.data()));
  } catch (err) {
    if (isIndexError(err)) {
      const qFallback = query(ref, where("status", "==", "published"));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toEventWithId(d.id, d.data()));
      list.sort((a, b) => {
        const ta = a.startDate instanceof Date ? a.startDate.getTime() : 0;
        const tb = b.startDate instanceof Date ? b.startDate.getTime() : 0;
        return tb - ta;
      });
      return list;
    }
    throw err;
  }
}

/** All events by creator (any status). */
export async function getEventsByCreator(createdByUid: string): Promise<EventWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("createdByUid", "==", createdByUid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toEventWithId(d.id, d.data()));
}

/** All events for a gym (to check before deleting the gym). */
export async function getEventsByGym(gymId: string): Promise<EventWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("gymId", "==", gymId),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toEventWithId(d.id, d.data()));
}

export async function createEvent(data: Omit<Event, "createdAt" | "updatedAt">): Promise<string> {
  const ref = collection(db, COLLECTION);
  const isPublic = data.status === "published";
  const docRef = await addDoc(ref, {
    gymId: data.gymId,
    title: data.title,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    type: data.type,
    status: data.status,
    isPublic,
    startDate: data.startDate instanceof Date ? data.startDate : data.startDate,
    endDate: data.endDate instanceof Date ? data.endDate : data.endDate,
    createdByUid: data.createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateEvent(
  eventId: string,
  data: Partial<Pick<Event, "gymId" | "title" | "description" | "imageUrl" | "type" | "status" | "startDate" | "endDate">>
): Promise<void> {
  const ref = doc(db, COLLECTION, eventId);
  const payload: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.status !== undefined) payload.isPublic = data.status === "published";
  await updateDoc(ref, payload);
}

/** Delete an event by id. Does not remove related workouts/leaderboards/scores. */
export async function deleteEvent(eventId: string): Promise<void> {
  const ref = doc(db, COLLECTION, eventId);
  await deleteDoc(ref);
}
