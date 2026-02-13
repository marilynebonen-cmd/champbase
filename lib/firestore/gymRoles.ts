/**
 * Rôles des membres d'un gym: gyms/{gymId}/member_roles/{userId}
 * Champs: userId, admin, coach, updatedAt
 * - admin: peut créer/éditer/supprimer des WODs du gym
 * - coach: réservé pour usage futur
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getGym, getGymsByOwner } from "@/lib/firestore/gyms";
import { getUser } from "@/lib/firestore/users";
import type { GymWithId } from "@/types";

const GYMS_COLLECTION = "gyms";
const MEMBER_ROLES_SUBCOLLECTION = "member_roles";

export type GymMemberRole = {
  admin: boolean;
  coach: boolean;
};

function memberRolesRef(gymId: string) {
  return collection(db, GYMS_COLLECTION, gymId, MEMBER_ROLES_SUBCOLLECTION);
}

function memberRoleDoc(gymId: string, userId: string) {
  return doc(db, GYMS_COLLECTION, gymId, MEMBER_ROLES_SUBCOLLECTION, userId);
}

/**
 * Retourne les rôles de tous les membres du gym (documents présents dans member_roles).
 */
export async function getGymMemberRoles(
  gymId: string
): Promise<Record<string, GymMemberRole>> {
  const ref = memberRolesRef(gymId);
  const snap = await getDocs(ref);
  const out: Record<string, GymMemberRole> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    out[d.id] = {
      admin: data.admin === true,
      coach: data.coach === true,
    };
  });
  return out;
}

/**
 * Retourne le rôle d'un membre dans un gym (pour afficher sur son profil public).
 */
export async function getMemberRoleInGym(
  gymId: string,
  userId: string
): Promise<GymMemberRole> {
  const ref = memberRoleDoc(gymId, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { admin: false, coach: false };
  const data = snap.data();
  return {
    admin: data.admin === true,
    coach: data.coach === true,
  };
}

/**
 * Met à jour un rôle (admin ou coach) pour un membre. Seul le propriétaire du gym peut appeler.
 */
export async function setGymMemberRole(
  gymId: string,
  userId: string,
  role: "admin" | "coach",
  value: boolean
): Promise<void> {
  const ref = memberRoleDoc(gymId, userId);
  const snap = await getDoc(ref);
  const current: GymMemberRole = snap.exists()
    ? {
        admin: snap.data().admin === true,
        coach: snap.data().coach === true,
      }
    : { admin: false, coach: false };
  const updated: GymMemberRole =
    role === "admin" ? { ...current, admin: value } : { ...current, coach: value };
  await setDoc(
    ref,
    {
      userId,
      admin: updated.admin,
      coach: updated.coach,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Liste des gyms où l'utilisateur peut créer des WODs (propriétaire, admin ou coach du gym).
 */
export async function getGymsWhereUserCanCreateWod(
  uid: string
): Promise<GymWithId[]> {
  const [ownerGyms, roleGymIds] = await Promise.all([
    getGymsByOwner(uid),
    getGymIdsWhereUserIsAdminOrCoach(uid),
  ]);
  const ownerIds = new Set(ownerGyms.map((g) => g.id));
  const roleOnlyIds = roleGymIds.filter((id) => !ownerIds.has(id));
  const roleGyms = await Promise.all(
    roleOnlyIds.map((id) => getGym(id).then((g) => g ?? null))
  );
  const combined = [...ownerGyms, ...roleGyms.filter((g): g is GymWithId => g != null)];
  return combined.sort((a, b) => {
    const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return tb - ta;
  });
}

/** IDs des gyms où l'utilisateur a le rôle admin ou coach (peut créer des WODs). */
async function getGymIdsWhereUserIsAdminOrCoach(uid: string): Promise<string[]> {
  const [adminIds, coachIds] = await Promise.all([
    getGymIdsWhereUserIsAdmin(uid),
    getGymIdsWhereUserIsCoach(uid),
  ]);
  return [...new Set([...adminIds, ...coachIds])];
}

/** IDs des gyms où l'utilisateur a le rôle admin. */
async function getGymIdsWhereUserIsAdmin(uid: string): Promise<string[]> {
  const ref = collectionGroup(db, MEMBER_ROLES_SUBCOLLECTION);
  const q = query(
    ref,
    where("userId", "==", uid),
    where("admin", "==", true)
  );
  const snap = await getDocs(q);
  const gymIds: string[] = [];
  snap.docs.forEach((d) => {
    const gymId = d.ref.parent.parent?.id;
    if (gymId) gymIds.push(gymId);
  });
  return gymIds;
}

/** IDs des gyms où l'utilisateur a le rôle coach. */
async function getGymIdsWhereUserIsCoach(uid: string): Promise<string[]> {
  const ref = collectionGroup(db, MEMBER_ROLES_SUBCOLLECTION);
  const q = query(
    ref,
    where("userId", "==", uid),
    where("coach", "==", true)
  );
  const snap = await getDocs(q);
  const gymIds: string[] = [];
  snap.docs.forEach((d) => {
    const gymId = d.ref.parent.parent?.id;
    if (gymId) gymIds.push(gymId);
  });
  return gymIds;
}

/** Rôles gym d'un utilisateur (pour affichage profil). */
export type GymRoleEntry = {
  gymId: string;
  gymName: string;
  admin: boolean;
  coach: boolean;
};

export async function getGymRolesForUser(uid: string): Promise<GymRoleEntry[]> {
  const [adminIds, coachIds] = await Promise.all([
    getGymIdsWhereUserIsAdmin(uid),
    getGymIdsWhereUserIsCoach(uid),
  ]);
  const gymIds = [...new Set([...adminIds, ...coachIds])];
  const entries: GymRoleEntry[] = [];
  await Promise.all(
    gymIds.map(async (gymId) => {
      const gym = await getGym(gymId);
      entries.push({
        gymId,
        gymName: gym?.name ?? gymId,
        admin: adminIds.includes(gymId),
        coach: coachIds.includes(gymId),
      });
    })
  );
  return entries.sort((a, b) => a.gymName.localeCompare(b.gymName));
}

/** True si l'utilisateur peut accéder à la zone Organizer (rôle organizer ou admin/coach d'au moins un gym). */
export async function canUserAccessOrganizerArea(uid: string): Promise<boolean> {
  const [profile, gyms] = await Promise.all([
    getUser(uid),
    getGymsWhereUserCanCreateWod(uid),
  ]);
  return (profile?.roles?.organizer === true) || gyms.length > 0;
}
