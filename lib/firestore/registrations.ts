/**
 * Firestore helpers: /registrations/{registrationId}
 * Inscriptions des athlètes aux événements.
 *
 * Composite index required (for optimal query):
 * - collectionGroup: registrations
 * - fields: userId (ASC), createdAt (DESC)
 * See firestore.indexes.json. Deploy with: firebase deploy --only firestore:indexes
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Division, EventRegistrationWithId } from "@/types";

const COLLECTION = "registrations";

export type GetRegistrationsByUserResult = {
  registrations: EventRegistrationWithId[];
  /** True when the indexed query failed and fallback (client-side sort) was used. */
  indexRequired?: boolean;
};

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate
    ? t.toDate()
    : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toRegistrationWithId(
  id: string,
  d: Record<string, unknown>
): EventRegistrationWithId {
  return {
    id,
    userId: (d.userId as string) ?? "",
    eventId: (d.eventId as string) ?? "",
    division: (d.division as Division) ?? "M_RX",
    email: d.email != null && d.email !== "" ? (d.email as string) : undefined,
    displayName: d.displayName != null && d.displayName !== "" ? (d.displayName as string) : undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
  };
}

function isIndexError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
  return (
    msg.includes("index") ||
    msg.includes("requires an index") ||
    code === "failed-precondition"
  );
}

/**
 * Fetches registrations for a user, newest first.
 * Uses composite index (userId + createdAt) when available; falls back to
 * userId-only query + client-side sort if the index is missing, and sets
 * indexRequired so the UI can show a friendly message.
 */
export async function getRegistrationsByUser(
  userId: string
): Promise<GetRegistrationsByUserResult> {
  const ref = collection(db, COLLECTION);

  try {
    const q = query(
      ref,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const registrations = snap.docs.map((d) => toRegistrationWithId(d.id, d.data()));
    return { registrations, indexRequired: false };
  } catch (err) {
    console.error("[getRegistrationsByUser] Query error (index may be missing):", err);

    if (isIndexError(err)) {
      // Fallback: query by userId only (no composite index), sort by createdAt client-side
      const qFallback = query(ref, where("userId", "==", userId));
      const snap = await getDocs(qFallback);
      const registrations = snap.docs.map((d) => toRegistrationWithId(d.id, d.data()));
      registrations.sort((a, b) => {
        const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
      return { registrations, indexRequired: true };
    }

    throw err;
  }
}

export async function createRegistration(data: {
  userId: string;
  eventId: string;
  division: Division;
  email?: string;
  displayName?: string;
}): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    userId: data.userId ?? "",
    eventId: data.eventId,
    division: data.division,
    email: data.email ? data.email.trim().toLowerCase() : null,
    displayName: data.displayName?.trim() || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRegistration(
  userId: string,
  eventId: string
): Promise<EventRegistrationWithId | null> {
  if (!userId) return null;
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("userId", "==", userId),
    where("eventId", "==", eventId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toRegistrationWithId(d.id, d.data());
}

/** Pending registrations (added by organizer) for an email. Used to claim when user signs in. */
export async function getPendingRegistrationsByEmail(
  email: string
): Promise<EventRegistrationWithId[]> {
  if (!email || !email.trim()) return [];
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("email", "==", email.trim().toLowerCase()),
    where("userId", "==", "")
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => toRegistrationWithId(d.id, d.data()));
  } catch {
    return [];
  }
}

/** Set userId on a registration (claim by athlete). */
export async function updateRegistrationUserId(
  registrationId: string,
  userId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, registrationId);
  await updateDoc(ref, { userId, updatedAt: serverTimestamp() } as Record<string, unknown>);
}

/** Registrations for an event (participants list). Requires index: eventId ASC, createdAt ASC (or desc). */
export async function getRegistrationsByEvent(
  eventId: string
): Promise<EventRegistrationWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("eventId", "==", eventId),
    orderBy("createdAt", "asc")
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => toRegistrationWithId(d.id, d.data()));
  } catch (err) {
    if (isIndexError(err)) {
      const qFallback = query(ref, where("eventId", "==", eventId));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toRegistrationWithId(d.id, d.data()));
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
