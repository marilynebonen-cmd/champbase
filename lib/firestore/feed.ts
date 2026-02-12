/**
 * Firestore: gyms/{gymId}/feedPosts, feedPosts/{postId}/replies, feedPosts/{postId}/stars
 * Feed posts are created/updated by Cloud Function on score write. Client only writes replies and stars.
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FeedPostWithId, FeedReplyWithId, FeedStar } from "@/types";

const FEED_POSTS_COLLECTION = "feedPosts";
const REPLIES_COLLECTION = "replies";
const STARS_COLLECTION = "stars";

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function feedPostsPath(gymId: string) {
  return collection(db, "gyms", gymId, FEED_POSTS_COLLECTION);
}

function feedPostDoc(gymId: string, postId: string) {
  return doc(db, "gyms", gymId, FEED_POSTS_COLLECTION, postId);
}

function repliesPath(gymId: string, postId: string) {
  return collection(db, "gyms", gymId, FEED_POSTS_COLLECTION, postId, REPLIES_COLLECTION);
}

function starDoc(gymId: string, postId: string, userId: string) {
  return doc(db, "gyms", gymId, FEED_POSTS_COLLECTION, postId, STARS_COLLECTION, userId);
}

function toFeedPostWithId(id: string, d: Record<string, unknown>): FeedPostWithId {
  return {
    id,
    gymId: (d.gymId as string) ?? "",
    wodId: (d.wodId as string) ?? "",
    scoreRefPath: (d.scoreRefPath as string) ?? undefined,
    athleteId: (d.athleteId as string) ?? "",
    athleteName: (d.athleteName as string) ?? "",
    athleteAvatarUrl: (d.athleteAvatarUrl as string) ?? undefined,
    wodTitle: (d.wodTitle as string) ?? "",
    scoringType: (d.scoringType as FeedPostWithId["scoringType"]) ?? "reps",
    scoreDisplay: (d.scoreDisplay as string) ?? "",
    valueRaw: (d.valueRaw as string) ?? undefined,
    division: (d.division as string) ?? undefined,
    caption: (d.caption as string) ?? undefined,
    photoUrl: (d.photoUrl as string) ?? undefined,
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
    repliesCount: typeof d.repliesCount === "number" ? d.repliesCount : 0,
    starsCount: typeof d.starsCount === "number" ? d.starsCount : 0,
    starsAvg: typeof d.starsAvg === "number" ? d.starsAvg : 0,
  };
}

function toReplyWithId(id: string, d: Record<string, unknown>): FeedReplyWithId {
  return {
    id,
    userId: (d.userId as string) ?? "",
    userName: (d.userName as string) ?? "",
    userAvatarUrl: (d.userAvatarUrl as string) ?? undefined,
    text: (d.text as string) ?? "",
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
  };
}

/** One-time fetch: feed posts page (for initial load or "Load more"). orderBy createdAt desc. */
export async function getFeedPostsPage(
  gymId: string,
  pageSize: number,
  startAfterDoc?: DocumentSnapshot
): Promise<{ posts: FeedPostWithId[]; lastVisible: DocumentSnapshot | null }> {
  const ref = feedPostsPath(gymId);
  const q = startAfterDoc
    ? query(
        ref,
        orderBy("createdAt", "desc"),
        startAfter(startAfterDoc),
        limit(pageSize)
      )
    : query(ref, orderBy("createdAt", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => toFeedPostWithId(d.id, d.data()));
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { posts, lastVisible };
}

/** Real-time listener for the first page of feed posts. orderBy createdAt desc. */
export function subscribeFeedPosts(
  gymId: string,
  pageSize: number,
  callback: (posts: FeedPostWithId[], lastVisible: DocumentSnapshot | null) => void
): Unsubscribe {
  const pathHint = `gyms/${gymId}/feedPosts`;
  const queryInfo = { collection: FEED_POSTS_COLLECTION, gymId, orderBy: "createdAt desc", limit: pageSize };
  const ref = feedPostsPath(gymId);
  const q = query(ref, orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs.map((d) => toFeedPostWithId(d.id, d.data()));
      const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      callback(posts, lastVisible);
    },
    (err) => {
      console.error("[SNAPSHOT ERROR]", { pathHint, queryInfo, code: err.code, message: err.message });
    }
  );
}

/** Real-time listener for replies of a post. */
export function subscribeReplies(
  gymId: string,
  postId: string,
  callback: (replies: FeedReplyWithId[]) => void
): Unsubscribe {
  const pathHint = `gyms/${gymId}/feedPosts/${postId}/replies`;
  const queryInfo = { collection: REPLIES_COLLECTION, gymId, postId, orderBy: "createdAt asc" };
  const ref = repliesPath(gymId, postId);
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const replies = snap.docs.map((d) => toReplyWithId(d.id, d.data()));
      callback(replies);
    },
    (err) => {
      console.error("[SNAPSHOT ERROR]", { pathHint, queryInfo, code: err.code, message: err.message });
    }
  );
}

/** Real-time listener for current user's star on a post. */
export function subscribeMyStar(
  gymId: string,
  postId: string,
  userId: string,
  callback: (star: FeedStar | null) => void
): Unsubscribe {
  const pathHint = `gyms/${gymId}/feedPosts/${postId}/stars/${userId}`;
  const queryInfo = { collection: STARS_COLLECTION, gymId, postId, userId };
  const ref = starDoc(gymId, postId, userId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const d = snap.data();
      callback({
        rating: (d.rating as number) ?? 0,
        createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
        updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
      });
    },
    (err) => {
      console.error("[SNAPSHOT ERROR]", { pathHint, queryInfo, code: err.code, message: err.message });
    }
  );
}

/** Add a reply (authenticated user). Cloud Function will update repliesCount. */
export async function addReply(
  gymId: string,
  postId: string,
  data: { userId: string; userName: string; userAvatarUrl?: string; text: string }
): Promise<string> {
  const ref = repliesPath(gymId, postId);
  const docRef = await addDoc(ref, {
    userId: data.userId,
    userName: data.userName,
    userAvatarUrl: data.userAvatarUrl ?? null,
    text: data.text.trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Set or update current user's star (1–5). Doc id = userId. Cloud Function updates starsCount/starsAvg. */
export async function setStar(
  gymId: string,
  postId: string,
  userId: string,
  rating: number
): Promise<void> {
  const ref = starDoc(gymId, postId, userId);
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  const now = serverTimestamp();
  await setDoc(ref, { rating: r, createdAt: now, updatedAt: now });
}
