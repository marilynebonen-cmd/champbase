/**
 * Firebase Storage helpers – score photos, profile photos (users, gyms).
 */
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CACHE_CONTROL = "public,max-age=31536000";

/**
 * Upload une image vers Storage et retourne l’URL de téléchargement.
 * Valide image/*, max 5 Mo. Utiliser pour users/{userId}/profile.jpg et gyms/{gymId}/profile.jpg.
 */
export async function uploadImageAndGetURL(file: File, path: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image (JPEG, PNG ou WebP).");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L’image ne doit pas dépasser 5 Mo.");
  }
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: CACHE_CONTROL,
  });
  return getDownloadURL(storageRef);
}

export type UploadScorePhotoResult = { storagePath: string; downloadUrl: string };

/**
 * Upload a score photo for a gym WOD. Replaces any existing file at same path.
 * Path: gyms/{gymId}/wodScores/{wodId}_{userId}[.ext]
 */
export async function uploadScorePhoto(
  gymId: string,
  wodId: string,
  userId: string,
  file: File
): Promise<UploadScorePhotoResult> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L’image ne doit pas dépasser 5 Mo.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG ou WebP.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `gyms/${gymId}/wodScores/${wodId}_${userId}.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Upload a score photo for the root collection feed (gym activity feed).
 * Path: gyms/{gymId}/scorePhotos/{userId}_{timestamp}.{ext}
 * Use the returned downloadUrl in the score doc (photoUrl).
 */
export async function uploadRootScorePhoto(
  gymId: string,
  userId: string,
  file: File
): Promise<{ downloadUrl: string }> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L'image ne doit pas dépasser 5 Mo.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG ou WebP.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `gyms/${gymId}/scorePhotos/${userId}_${Date.now()}.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl };
}

/**
 * Upload gym banner (cover image). Path: gyms/{gymId}/banner.{ext}
 * Returns download URL to store in gym.imageUrl.
 */
export async function uploadGymBanner(gymId: string, file: File): Promise<{ downloadUrl: string }> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L'image ne doit pas dépasser 5 Mo.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG ou WebP.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `gyms/${gymId}/banner.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl };
}

/**
 * Upload event banner (cover image). Path: events/{eventId}/banner.{ext}
 * Returns download URL to store in event.imageUrl (Firestore).
 */
export async function uploadEventBanner(eventId: string, file: File): Promise<{ downloadUrl: string }> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L'image ne doit pas dépasser 5 Mo.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG ou WebP.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `events/${eventId}/banner.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl };
}

/**
 * Upload a score photo for gym daily WOD (activity feed).
 * Path: gyms/{gymId}/wods/{workoutId}/scores/{athleteUid}/{timestamp}.jpg
 * Store the returned downloadUrl in both the score doc and the feed doc.
 */
export async function uploadGymWodScorePhoto(
  gymId: string,
  workoutId: string,
  athleteUid: string,
  file: File
): Promise<{ downloadUrl: string }> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("L'image ne doit pas dépasser 5 Mo.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG ou WebP.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const timestamp = Date.now();
  const storagePath = `gyms/${gymId}/wods/${workoutId}/scores/${athleteUid}/${timestamp}.${safeExt}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl };
}
