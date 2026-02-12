/**
 * Firestore helpers: /gyms/{gymId}
 */
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
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
import type { Gym, GymWithId } from "@/types";
import { getEventsByGym } from "@/lib/firestore/events";
import { getWorkoutsByGym } from "@/lib/firestore/workouts";

const COLLECTION = "gyms";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toGymWithId(id: string, d: Record<string, unknown>): GymWithId {
  const photoUrls = d.photoUrls as string[] | undefined;
  const rawImageUrl = d.imageUrl != null ? String(d.imageUrl).trim() : "";
  return {
    id,
    name: (d.name as string) ?? "",
    city: (d.city as string) ?? undefined,
    country: (d.country as string) ?? undefined,
    address: (d.address as string) ?? undefined,
    description: (d.description as string) ?? undefined,
    phone: (d.phone as string) ?? undefined,
    website: (d.website as string) ?? undefined,
    schedule: (d.schedule as string) ?? undefined,
    affiliations: (d.affiliations as string) ?? undefined,
    programming: (d.programming as string) ?? undefined,
    openingDate: (d.openingDate as string) ?? undefined,
    imageUrl: rawImageUrl !== "" ? rawImageUrl : undefined,
    photoUrls: Array.isArray(photoUrls) ? photoUrls.filter((u): u is string => typeof u === "string") : undefined,
    ownerUid: (d.ownerUid as string) ?? "",
    feedIsPublic: d.feedIsPublic === false ? false : true,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getGym(gymId: string): Promise<GymWithId | null> {
  const ref = doc(db, COLLECTION, gymId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toGymWithId(snap.id, snap.data());
}

/** Lecture depuis le serveur Firestore (pas le cache). À utiliser après une mise à jour pour afficher les dernières données. */
export async function getGymFromServer(gymId: string): Promise<GymWithId | null> {
  const ref = doc(db, COLLECTION, gymId);
  const snap = await getDocFromServer(ref);
  if (!snap.exists()) return null;
  return toGymWithId(snap.id, snap.data());
}

export async function getGymsByOwner(ownerUid: string): Promise<GymWithId[]> {
  const ref = collection(db, COLLECTION);
  try {
    const q = query(
      ref,
      where("ownerUid", "==", ownerUid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toGymWithId(d.id, d.data()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("index") || msg.includes("requires an index")) {
      const qFallback = query(ref, where("ownerUid", "==", ownerUid));
      const snap = await getDocs(qFallback);
      const list = snap.docs.map((d) => toGymWithId(d.id, d.data()));
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

export async function getGymsList(limitCount = 50): Promise<GymWithId[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toGymWithId(d.id, d.data()));
}

/** Normalize for uniqueness: same name + same address (city, country) = doublon. */
function sameNameAndAddress(a: GymWithId, name: string, city: string, country: string): boolean {
  const nameEq = (a.name ?? "").trim().toLowerCase() === name.trim().toLowerCase();
  const cityEq = (a.city ?? "").trim().toLowerCase() === city.trim().toLowerCase();
  const countryEq = (a.country ?? "").trim().toLowerCase() === country.trim().toLowerCase();
  return nameEq && cityEq && countryEq;
}

export async function createGym(data: Omit<Gym, "createdAt" | "updatedAt">): Promise<string> {
  const name = (data.name ?? "").trim();
  const city = (data.city ?? "").trim();
  const country = (data.country ?? "").trim();
  const existing = await getGymsByOwner(data.ownerUid);
  const duplicate = existing.find((g) => sameNameAndAddress(g, name, city, country));
  if (duplicate) {
    throw new Error("Un gym avec ce nom et cette adresse existe déjà.");
  }
  const payload: Record<string, unknown> = {
    name: data.name,
    city: data.city ?? null,
    country: data.country ?? null,
    ownerUid: data.ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.address !== undefined) payload.address = data.address ?? null;
  if (data.description !== undefined) payload.description = data.description ?? null;
  if (data.phone !== undefined) payload.phone = data.phone ?? null;
  if (data.website !== undefined) payload.website = data.website ?? null;
  if (data.schedule !== undefined) payload.schedule = data.schedule ?? null;
  if (data.affiliations !== undefined) payload.affiliations = data.affiliations ?? null;
  if (data.programming !== undefined) payload.programming = data.programming ?? null;
  if (data.openingDate !== undefined) payload.openingDate = data.openingDate ?? null;
  if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl ?? null;
  if (data.photoUrls !== undefined) payload.photoUrls = data.photoUrls ?? null;
  if ("feedIsPublic" in data) payload.feedIsPublic = data.feedIsPublic !== false;
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, payload as Record<string, unknown>);
  return docRef.id;
}

const GYM_EDIT_FIELDS = [
  "name", "city", "country", "address", "description", "phone", "website", "schedule", "affiliations", "programming", "openingDate", "imageUrl", "photoUrls", "feedIsPublic",
] as const;

export async function updateGym(
  gymId: string,
  data: Partial<Pick<Gym, (typeof GYM_EDIT_FIELDS)[number]>>
): Promise<void> {
  const ref = doc(db, COLLECTION, gymId);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const key of GYM_EDIT_FIELDS) {
    if (key in data && data[key as keyof typeof data] !== undefined) {
      const v = data[key as keyof typeof data];
      (payload as Record<string, unknown>)[key] = v ?? null;
    }
  }
  await updateDoc(ref, payload);
}

/** Met à jour uniquement l’URL de la photo de bannière du gym (Firestore champ imageUrl). */
export async function updateGymImageUrl(gymId: string, imageUrl: string): Promise<void> {
  const ref = doc(db, COLLECTION, gymId);
  await updateDoc(ref, {
    imageUrl,
    updatedAt: serverTimestamp(),
  });
}

/** Met à jour uniquement le logo / photo de profil du gym (Firestore champ photoURL). */
export async function updateGymPhoto(gymId: string, photoURL: string): Promise<void> {
  const ref = doc(db, COLLECTION, gymId);
  await updateDoc(ref, {
    photoURL,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Supprime le gym de Firestore (document dans la collection "gyms").
 * Si force === false et que le gym a des événements ou des WODs, lance une erreur.
 * Si force === true, supprime le document même dans ce cas (les événements/WODs restent avec un gymId orphelin).
 */
export async function deleteGym(gymId: string, force = false): Promise<void> {
  if (!force) {
    const [events, workouts] = await Promise.all([
      getEventsByGym(gymId),
      getWorkoutsByGym(gymId),
    ]);
    if (events.length > 0) {
      throw new Error("Impossible de supprimer : ce gym a des événements. Supprimez d’abord les événements, ou confirmez une suppression forcée.");
    }
    if (workouts.length > 0) {
      throw new Error("Impossible de supprimer : ce gym a des WODs. Supprimez d’abord les workouts, ou confirmez une suppression forcée.");
    }
  }
  const ref = doc(db, COLLECTION, gymId);
  await deleteDoc(ref);
}
