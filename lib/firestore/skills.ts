/**
 * Firestore: users/{uid}/skills/{movementId}
 * État acquis (acquired) par mouvement pour la checklist compétences.
 */
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const USERS_COLLECTION = "users";
const SKILLS_SUBCOLLECTION = "skills";

function skillsRef(uid: string) {
  return collection(db, USERS_COLLECTION, uid, SKILLS_SUBCOLLECTION);
}

/**
 * Retourne un Record movementId -> acquired (true/false).
 * Seuls les mouvements avec un doc sont retournés; absence = non acquis.
 */
export async function getUserSkillStates(uid: string): Promise<Record<string, boolean>> {
  const ref = skillsRef(uid);
  const snap = await getDocs(ref);
  const out: Record<string, boolean> = {};
  snap.docs.forEach((d) => {
    out[d.id] = d.data().acquired === true;
  });
  return out;
}

/**
 * Écrit ou met à jour l'état acquis pour un mouvement.
 * acquiredAt mis à jour seulement quand acquired passe à true.
 */
export async function setUserSkillState(
  uid: string,
  movementId: string,
  acquired: boolean
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid, SKILLS_SUBCOLLECTION, movementId);
  const snap = await getDoc(ref);
  const payload: Record<string, unknown> = {
    acquired,
    updatedAt: serverTimestamp(),
  };
  if (acquired) {
    payload.acquiredAt = serverTimestamp();
  } else if (snap.exists()) {
    payload.acquiredAt = deleteField();
  }
  await setDoc(ref, payload, { merge: true });
}

/**
 * Abonnement temps réel aux états skills de l'utilisateur.
 * Retourne une fonction unsubscribe.
 */
export function subscribeUserSkillStates(
  uid: string,
  callback: (states: Record<string, boolean>) => void
): () => void {
  const ref = skillsRef(uid);
  const unsubscribe = onSnapshot(ref, (snap) => {
    const out: Record<string, boolean> = {};
    snap.docs.forEach((d) => {
      out[d.id] = d.data().acquired === true;
    });
    callback(out);
  });
  return unsubscribe;
}
