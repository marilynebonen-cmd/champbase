/**
 * Firestore: users/{uid}/skill_visibility/{categoryId}
 * Visibilité publique de chaque catégorie de compétence (pour le profil).
 * Absence de doc = public (isPublic true par défaut).
 */
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SKILL_CATEGORIES } from "@/lib/skillsCatalog";
import type { SkillCategoryId } from "@/lib/skillsCatalog";

const USERS_COLLECTION = "users";
const SKILL_VISIBILITY_SUBCOLLECTION = "skill_visibility";

/**
 * Retourne un Record categoryId -> isPublic.
 * Absence de doc pour une catégorie = true (public par défaut).
 */
export async function getSkillCategoryVisibility(
  uid: string,
  categoryIds: SkillCategoryId[]
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    categoryIds.map(async (id) => {
      const ref = doc(db, USERS_COLLECTION, uid, SKILL_VISIBILITY_SUBCOLLECTION, id);
      const snap = await getDoc(ref);
      out[id] = snap.exists() ? snap.data().isPublic !== false : true;
    })
  );
  return out;
}

/**
 * Met à jour la visibilité d'une catégorie de compétence.
 */
export async function setSkillCategoryVisibility(
  uid: string,
  categoryId: string,
  isPublic: boolean
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid, SKILL_VISIBILITY_SUBCOLLECTION, categoryId);
  await setDoc(ref, { isPublic, updatedAt: serverTimestamp() }, { merge: true });
}

/** Met à jour la visibilité de toutes les catégories de compétences (profil : tout public ou tout privé). */
export async function setAllSkillCategoryVisibility(
  uid: string,
  isPublic: boolean
): Promise<void> {
  await Promise.all(
    SKILL_CATEGORIES.map((cat) => setSkillCategoryVisibility(uid, cat.id, isPublic))
  );
}
