/**
 * Firestore helpers: /users/{uid}
 * Create user doc on first signup; read/update profile.
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, UserRoles, Division } from "@/types";

const COLLECTION = "users";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

/** List users affiliated to a gym (for gym profile page). Requires rule: read if resource.data.gymId != null. */
export async function getUsersByGym(gymId: string): Promise<UserProfile[]> {
  if (!gymId?.trim()) return [];
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("gymId", "==", gymId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      const uid = d.id;
      const affiliatedGymId = (data.gymId as string | undefined) ?? (data.affiliatedGymId as string | undefined);
      return {
        uid,
        displayName: (data.displayName as string) ?? "",
        email: (data.email as string) ?? "",
        roles: (data.roles as UserProfile["roles"]) ?? { athlete: false, organizer: false },
        firstName: data.firstName as string | undefined,
        lastName: data.lastName as string | undefined,
        dateOfBirth: data.dateOfBirth as string | undefined,
        affiliatedGymId: affiliatedGymId ?? undefined,
        preferredDivision: data.preferredDivision as UserProfile["preferredDivision"],
        photoURL: data.photoURL as string | undefined,
        createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
      } as UserProfile;
    })
    .filter(Boolean);
}

const IN_QUERY_LIMIT = 30;

function docToUserProfile(id: string, d: Record<string, unknown>): UserProfile {
  const gymId = (d.gymId as string | undefined) ?? (d.affiliatedGymId as string | undefined);
  return {
    uid: id,
    displayName: (d.displayName as string) ?? "",
    email: (d.email as string) ?? "",
    roles: (d.roles as UserProfile["roles"]) ?? { athlete: false, organizer: false },
    firstName: d.firstName as string | undefined,
    lastName: d.lastName as string | undefined,
    dateOfBirth: d.dateOfBirth as string | undefined,
    affiliatedGymId: gymId ?? undefined,
    preferredDivision: d.preferredDivision as Division | undefined,
    photoURL: d.photoURL as string | undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToUserProfile(snap.id, snap.data());
}

/** Batch fetch user profiles by UIDs. Uses chunked "in" queries (max 30 per query). Returns Map(uid -> profile). */
export async function getUsersByIds(uids: string[]): Promise<Map<string, UserProfile>> {
  const unique = [...new Set(uids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const result = new Map<string, UserProfile>();
  for (let i = 0; i < unique.length; i += IN_QUERY_LIMIT) {
    const chunk = unique.slice(i, i + IN_QUERY_LIMIT);
    const ref = collection(db, COLLECTION);
    const q = query(ref, where(documentId(), "in", chunk), limit(IN_QUERY_LIMIT));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      result.set(d.id, docToUserProfile(d.id, d.data()));
    });
  }
  return result;
}

/** Call after first signup to create /users/{uid}. Idempotent: does not overwrite existing. */
export async function createUserIfNew(
  uid: string,
  data: { displayName: string; email: string; roles?: Partial<UserRoles> }
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  // Production structure: uid, displayName, email, roles, gymId (optional), createdAt, updatedAt
  await setDoc(ref, {
    uid: uid,
    displayName: data.displayName,
    email: data.email,
    roles: {
      athlete: data.roles?.athlete ?? true,
      organizer: data.roles?.organizer ?? false,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<
    Pick<
      UserProfile,
      | "displayName"
      | "roles"
      | "firstName"
      | "lastName"
      | "dateOfBirth"
      | "affiliatedGymId"
      | "preferredDivision"
      | "photoURL"
    >
  >
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.displayName !== undefined) payload.displayName = data.displayName;
  if (data.roles !== undefined) payload.roles = data.roles;
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth;
  // Production: store as gymId in Firestore.
  if (data.affiliatedGymId !== undefined) payload.gymId = data.affiliatedGymId;
  if (data.preferredDivision !== undefined)
    payload.preferredDivision = data.preferredDivision;
  if (data.photoURL !== undefined) payload.photoURL = data.photoURL;
  await updateDoc(ref, payload);
}

/** Met à jour uniquement la photo de profil (photoURL + updatedAt). */
export async function updateUserPhoto(userId: string, photoURL: string): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  await updateDoc(ref, {
    photoURL,
    updatedAt: serverTimestamp(),
  });
}
