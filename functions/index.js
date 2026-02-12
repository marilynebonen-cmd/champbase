/**
 * Champ Cloud Functions (2nd gen).
 * - onWodScoreWritten: create/update feed post when gym WOD score is written (Daily WOD only: eventId null).
 * - onFeedStarWritten: update feedPosts starsCount and starsAvg when a star doc is created/updated/deleted.
 * - onFeedReplyWritten: update feedPosts repliesCount when a reply is created or deleted.
 */
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const {
  onDocumentWritten: onDocWritten,
  onDocumentCreated: onDocCreated,
  onDocumentDeleted: onDocDeleted,
} = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();
const db = getFirestore();

// --- Score display (mirror lib/wodScoreUtils) ---
// scoreType: nested = "time"|"reps"|"weight"; root = "TIME"|"REPS"|"WEIGHT"
function formatScoreDisplay(scoreType, value, valueRaw) {
  const type = (scoreType || "").toLowerCase();
  if (valueRaw != null && valueRaw !== "") {
    if (type === "weight" && !valueRaw.includes("lb") && !valueRaw.includes("kg"))
      return `${valueRaw} lb`;
    return valueRaw;
  }
  if (type === "time") {
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return m >= 60
      ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }
  if (type === "weight") return `${value} lb`;
  return String(value);
}

// Root score: scoreValue is string (e.g. "5:30", "225", "120"); scoreType "REPS"|"TIME"|"WEIGHT"
function formatRootScoreDisplay(scoreType, scoreValue) {
  if (!scoreValue || scoreValue.trim() === "") return "—";
  const v = scoreValue.trim();
  const type = (scoreType || "").toUpperCase();
  if (type === "TIME") return v;
  if (type === "WEIGHT") return v.includes("lb") || v.includes("kg") ? v : `${v} lb`;
  if (type === "REPS") return `${v} reps`;
  return v;
}

// Preserve existing aggregates on merge
async function getExistingAggregates(ref) {
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : {};
  return {
    repliesCount: typeof d.repliesCount === "number" ? d.repliesCount : 0,
    starsCount: typeof d.starsCount === "number" ? d.starsCount : 0,
    starsAvg: typeof d.starsAvg === "number" ? d.starsAvg : 0,
  };
}

exports.onWodScoreWritten = onDocWritten(
  "gyms/{gymId}/wods/{wodId}/scores/{userId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data();
    const { gymId, wodId, userId } = event.params;

    const wodRef = db.doc(`gyms/${gymId}/wods/${wodId}`);
    const wodSnap = await wodRef.get();
    if (!wodSnap.exists) return;
    const wod = wodSnap.data();
    if (wod.eventId != null && wod.eventId !== "") return;

    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    const user = userSnap.exists ? userSnap.data() : {};
    const athleteName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || user.email || "Athlète";
    const athleteAvatarUrl = user.photoURL ?? null;

    const scoreType = wod.scoreType ?? "reps";
    const value = typeof data.value === "number" ? data.value : 0;
    const valueRaw = data.valueRaw ?? null;
    const scoreDisplay = formatScoreDisplay(scoreType, value, valueRaw);

    const postId = `${wodId}_${userId}`;
    const feedPostRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
    const scoreRefPath = `gyms/${gymId}/wods/${wodId}/scores/${userId}`;
    const now = FieldValue.serverTimestamp();
    const existing = await getExistingAggregates(feedPostRef);
    const divisionLabel = data.division ? String(data.division).replace("_", " ") : null;

    await feedPostRef.set({
      gymId,
      wodId,
      scoreRefPath,
      athleteId: userId,
      athleteName,
      athleteAvatarUrl,
      wodTitle: wod.title ?? "",
      scoringType: scoreType,
      scoreDisplay,
      valueRaw: valueRaw ?? null,
      division: divisionLabel,
      caption: data.caption ?? null,
      photoUrl: data.photoUrl ?? null,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      repliesCount: existing.repliesCount,
      starsCount: existing.starsCount,
      starsAvg: existing.starsAvg,
    }, { merge: true });
  }
);

// --- Root scores: create/update feed post when a ROOT collection score is written (Daily WOD only: isEventScore !== true) ---
exports.onRootScoreWritten = onDocWritten(
  "scores/{scoreId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data();
    if (data.isEventScore === true) return;

    const gymId = data.gymId;
    const eventId = data.eventId;
    if (!gymId || (eventId != null && eventId !== "")) return;

    const workoutId = data.workoutId;
    const athleteUid = data.athleteUid;
    if (!workoutId || !athleteUid) return;

    const workoutRef = db.doc(`workouts/${workoutId}`);
    const workoutSnap = await workoutRef.get();
    if (!workoutSnap.exists) return;
    const workout = workoutSnap.data();
    if (workout.eventId != null && workout.eventId !== "") return;

    const userRef = db.doc(`users/${athleteUid}`);
    const userSnap = await userRef.get();
    const user = userSnap.exists ? userSnap.data() : {};
    const athleteName = [user.firstName, user.lastName].filter(Boolean).join(" ") || data.athleteName || user.displayName || user.email || "Athlète";
    const athleteAvatarUrl = user.photoURL ?? null;

    const scoreType = (workout.scoreType || data.scoreType || "REPS").toString();
    const scoreValue = (data.scoreValue || "").toString();
    const scoreDisplay = formatRootScoreDisplay(scoreType, scoreValue);
    const division = data.division ? String(data.division).replace("_", " ") : null;

    const postId = `${workoutId}_${athleteUid}`;
    const feedPostRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
    const now = FieldValue.serverTimestamp();
    const existing = await getExistingAggregates(feedPostRef);
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;

    await feedPostRef.set({
      gymId,
      wodId: workoutId,
      scoreRefPath: `scores/${event.params.scoreId}`,
      athleteId: athleteUid,
      athleteName,
      athleteAvatarUrl,
      wodTitle: workout.name ?? "",
      scoringType: scoreType.toLowerCase(),
      scoreDisplay,
      valueRaw: scoreValue || null,
      division,
      caption: data.comment ?? data.caption ?? null,
      photoUrl: data.photoUrl ?? null,
      createdAt: createdAt || now,
      updatedAt: now,
      repliesCount: existing.repliesCount,
      starsCount: existing.starsCount,
      starsAvg: existing.starsAvg,
    }, { merge: true });
  }
);

/** Build one feed post from score data (shared by backfill). */
async function upsertFeedPostFromScore(gymId, wodId, userId, data, wod, createdAt, updatedAt) {
  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  const user = userSnap.exists ? userSnap.data() : {};
  const athleteName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || user.email || "Athlète";
  const athleteAvatarUrl = user.photoURL ?? null;

  const scoreType = wod.scoreType ?? "reps";
  const value = typeof data.value === "number" ? data.value : 0;
  const valueRaw = data.valueRaw ?? null;
  const scoreDisplay = formatScoreDisplay(scoreType, value, valueRaw);

  const postId = `${wodId}_${userId}`;
  const feedPostRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
  const scoreRefPath = `gyms/${gymId}/wods/${wodId}/scores/${userId}`;
  const existing = await getExistingAggregates(feedPostRef);
  const divisionLabel = data.division ? String(data.division).replace("_", " ") : null;

  await feedPostRef.set({
    gymId,
    wodId,
    scoreRefPath,
    athleteId: userId,
    athleteName,
    athleteAvatarUrl,
    wodTitle: wod.title ?? "",
    scoringType: scoreType,
    scoreDisplay,
    valueRaw: valueRaw ?? null,
    division: divisionLabel,
    caption: data.caption ?? null,
    photoUrl: data.photoUrl ?? null,
    createdAt: createdAt || FieldValue.serverTimestamp(),
    updatedAt: updatedAt || FieldValue.serverTimestamp(),
    repliesCount: existing.repliesCount,
    starsCount: existing.starsCount,
    starsAvg: existing.starsAvg,
  }, { merge: true });
}

/** Callable: backfill feed posts from ROOT collection scores (gymId match, no eventId). */
exports.backfillFeedFromRootScores = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentification requise.");
    const gymId = request.data?.gymId;
    if (!gymId || typeof gymId !== "string") throw new HttpsError("invalid-argument", "gymId requis.");

    const scoresSnap = await db.collection("scores")
      .where("gymId", "==", gymId)
      .get();

    let created = 0;
    for (const scoreDoc of scoresSnap.docs) {
      const data = scoreDoc.data();
      if (data.isEventScore === true) continue;
      const eventId = data.eventId;
      if (eventId != null && eventId !== "") continue;

      const workoutId = data.workoutId;
      const athleteUid = data.athleteUid;
      if (!workoutId || !athleteUid) continue;

      const workoutRef = db.doc(`workouts/${workoutId}`);
      const workoutSnap = await workoutRef.get();
      if (!workoutSnap.exists) continue;
      const workout = workoutSnap.data();
      if (workout.eventId != null && workout.eventId !== "") continue;

      const userRef = db.doc(`users/${athleteUid}`);
      const userSnap = await userRef.get();
      const user = userSnap.exists ? userSnap.data() : {};
      const athleteName = [user.firstName, user.lastName].filter(Boolean).join(" ") || data.athleteName || user.displayName || user.email || "Athlète";
      const athleteAvatarUrl = user.photoURL ?? null;

      const scoreType = (workout.scoreType || data.scoreType || "REPS").toString();
      const scoreValue = (data.scoreValue || "").toString();
      const scoreDisplay = formatRootScoreDisplay(scoreType, scoreValue);
      const division = data.division ? String(data.division).replace("_", " ") : null;

      const postId = `${workoutId}_${athleteUid}`;
      const feedPostRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
      const existing = await getExistingAggregates(feedPostRef);
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt : null;
      const updatedAt = data.updatedAt && data.updatedAt.toDate ? data.updatedAt : null;

      await feedPostRef.set({
        gymId,
        wodId: workoutId,
        scoreRefPath: `scores/${scoreDoc.id}`,
        athleteId: athleteUid,
        athleteName,
        athleteAvatarUrl,
        wodTitle: workout.name ?? "",
        scoringType: scoreType.toLowerCase(),
        scoreDisplay,
        valueRaw: scoreValue || null,
        division,
        caption: data.comment ?? data.caption ?? null,
        photoUrl: data.photoUrl ?? null,
        createdAt: createdAt || FieldValue.serverTimestamp(),
        updatedAt: updatedAt || FieldValue.serverTimestamp(),
        repliesCount: existing.repliesCount,
        starsCount: existing.starsCount,
        starsAvg: existing.starsAvg,
      }, { merge: true });
      created += 1;
    }
    return { success: true, postsCreated: created };
  }
);

/** Callable: backfill feed posts from existing gym WOD scores (Daily WODs only). */
exports.backfillGymFeed = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentification requise.");
    const gymId = request.data?.gymId;
    if (!gymId || typeof gymId !== "string") throw new HttpsError("invalid-argument", "gymId requis.");

    const wodsSnap = await db.collection(`gyms/${gymId}/wods`).get();
    let created = 0;
    for (const wodDoc of wodsSnap.docs) {
      const wod = wodDoc.data();
      const wodId = wodDoc.id;
      if (wod.eventId != null && wod.eventId !== "") continue;

      const scoresSnap = await db.collection(`gyms/${gymId}/wods/${wodId}/scores`).get();
      for (const scoreDoc of scoresSnap.docs) {
        const userId = scoreDoc.id;
        const data = scoreDoc.data();
        const createdAt = data.createdAt;
        const updatedAt = data.updatedAt || createdAt;
        await upsertFeedPostFromScore(gymId, wodId, userId, data, wod, createdAt, updatedAt);
        created += 1;
      }
    }
    return { success: true, postsCreated: created };
  }
);

// --- Stars aggregate ---
async function updateStarsAggregate(gymId, postId) {
  const starsRef = db.collection(`gyms/${gymId}/feedPosts/${postId}/stars`);
  const snap = await starsRef.get();
  let total = 0;
  let count = 0;
  snap.docs.forEach((d) => {
    const r = d.data().rating;
    if (typeof r === "number" && r >= 1 && r <= 5) {
      total += r;
      count += 1;
    }
  });
  const starsCount = count;
  const starsAvg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  const postRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
  await postRef.update({ starsCount, starsAvg, updatedAt: FieldValue.serverTimestamp() });
}

exports.onFeedStarWritten = onDocWritten(
  "gyms/{gymId}/feedPosts/{postId}/stars/{userId}",
  async (event) => {
    const { gymId, postId } = event.params;
    await updateStarsAggregate(gymId, postId);
  }
);

// --- Replies count ---
async function updateRepliesCount(gymId, postId) {
  const repliesRef = db.collection(`gyms/${gymId}/feedPosts/${postId}/replies`);
  const snap = await repliesRef.get();
  const repliesCount = snap.size;
  const postRef = db.doc(`gyms/${gymId}/feedPosts/${postId}`);
  await postRef.update({ repliesCount, updatedAt: FieldValue.serverTimestamp() });
}

exports.onFeedReplyCreated = onDocCreated(
  "gyms/{gymId}/feedPosts/{postId}/replies/{replyId}",
  async (event) => {
    const { gymId, postId } = event.params;
    await updateRepliesCount(gymId, postId);
  }
);

exports.onFeedReplyDeleted = onDocDeleted(
  "gyms/{gymId}/feedPosts/{postId}/replies/{replyId}",
  async (event) => {
    const { gymId, postId } = event.params;
    await updateRepliesCount(gymId, postId);
  }
);
