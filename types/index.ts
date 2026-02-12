/**
 * Champ – shared TypeScript types and Firestore document shapes.
 */

/** Firestore Timestamp or JS Date (for reading/writing). */
export type TimestampLike = { seconds: number; nanoseconds: number } | Date;

// ─── Divisions ─────────────────────────────────────────────────────────────
export const DIVISIONS = ["M_RX", "M_SCALED", "F_RX", "F_SCALED"] as const;
export type Division = (typeof DIVISIONS)[number];

// ─── Score types (for workouts and scores) ──────────────────────────────────
export const SCORE_TYPES = ["REPS", "TIME", "WEIGHT"] as const;
export type ScoreType = (typeof SCORE_TYPES)[number];

// ─── User (Firestore: /users/{uid}) ─────────────────────────────────────────
export type UserRoles = {
  athlete: boolean;
  organizer: boolean;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  roles: UserRoles;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  affiliatedGymId?: string;
  preferredDivision?: Division;
  photoURL?: string;
  /** Si false, les benchmarks ne sont pas visibles sur le profil public. Défaut true. */
  benchmarksPublic?: boolean;
  /** Si false, les compétences ne sont pas visibles sur le profil public. Défaut true. */
  skillsPublic?: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

// ─── Event registration ────────────────────────────────────────────────────
export type EventRegistration = {
  /** Empty when added by organizer (pending until user signs in and claims). */
  userId: string;
  eventId: string;
  division: Division;
  /** Set when organizer adds by email; used to link registration when user signs in. */
  email?: string;
  /** Display name when added by organizer or from user profile. */
  displayName?: string;
  createdAt: TimestampLike;
};

export type EventRegistrationWithId = EventRegistration & { id: string };

// ─── Gym (Firestore: /gyms/{gymId}) ─────────────────────────────────────────
export type Gym = {
  name: string;
  city?: string;
  country?: string;
  /** Adresse complète (rue, numéro, etc.) */
  address?: string;
  /** Description du gym (présentation, équipements, ambiance) */
  description?: string;
  /** Téléphone */
  phone?: string;
  /** Site web (URL) */
  website?: string;
  /** Horaires d'ouverture (texte libre) */
  schedule?: string;
  /** Affiliations (ex: CrossFit, autre) */
  affiliations?: string;
  /** Programmation (ex: CrossFit, Haltérophilie, etc.) */
  programming?: string;
  /** Date d'ouverture (texte libre) */
  openingDate?: string;
  /** URL de la photo de couverture (bannière) */
  imageUrl?: string;
  /** URL du logo / photo de profil du gym (Storage: gyms/{gymId}/profile.jpg) */
  photoURL?: string;
  /** URLs des photos de la galerie (optionnel) */
  photoUrls?: string[];
  ownerUid: string;
  /** Si true, feed du gym est lisible par tous; sinon membres/auth. Défaut true. */
  feedIsPublic?: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type GymWithId = Gym & { id: string };

// ─── Event (Firestore: /events/{eventId}) ───────────────────────────────────
export type EventType = "online" | "live";

export type EventStatus = "draft" | "published" | "archived";

export type Event = {
  gymId: string;
  title: string;
  description?: string;
  /** Optional image URL for event card (onglet Events). */
  imageUrl?: string;
  type: EventType;
  status: EventStatus;
  /** Derived: true when status === "published" */
  isPublic: boolean;
  startDate: TimestampLike;
  endDate: TimestampLike;
  createdByUid: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type EventWithId = Event & { id: string };

// ─── Workout (Firestore: /workouts/{workoutId}) ─────────────────────────────
export type WorkoutScope = "EVENT" | "GYM";

export type Workout = {
  gymId: string;
  eventId: string | null; // null = gym WOD (WOD of the day)
  /** Derived: EVENT if eventId != null, GYM otherwise */
  workoutScope: WorkoutScope;
  name: string;
  description?: string;
  scoreType: ScoreType;
  scoringNotes?: string;
  unit: string; // "reps" | "mm:ss" | "lb" | "kg"
  deadline: TimestampLike | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type WorkoutWithId = Workout & { id: string };

// ─── Leaderboard (Firestore: /leaderboards/{leaderboardId}) ─────────────────
// Pour un événement : 1 leaderboard par event (workoutId et division à null), les catégories sont des filtres.
// Pour un gym (WOD hors event) : un leaderboard par (workout + division) peut exister.
export type Leaderboard = {
  gymId: string;
  eventId: string | null;
  /** null = leaderboard de l'événement (tous les WODs), les divisions sont des filtres */
  workoutId: string | null;
  /** null = leaderboard event (filtres par catégorie côté UI) */
  division: Division | null;
  isPublic: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type LeaderboardWithId = Leaderboard & { id: string };

// ─── Score (Firestore: /scores/{scoreId}) ───────────────────────────────────
export type SubmissionType = "athlete" | "judge";

export type Score = {
  gymId: string;
  /** When true, score is for an event workout (excluded from gym activity feed). */
  isEventScore: boolean;
  eventId: string | null;
  leaderboardId: string;
  workoutId: string;
  athleteUid: string;
  athleteName: string;
  division: Division;
  scoreType: ScoreType;
  scoreValue: string; // TIME: "mm:ss", WEIGHT: "225", REPS: "120"
  submittedByUid: string;
  submissionType: SubmissionType;
  /** Optional caption for gym feed (daily WOD only). */
  comment?: string;
  /** Optional photo download URL (upload to Storage then save here). */
  photoUrl?: string;
  createdAt: TimestampLike;
  updatedAt?: TimestampLike;
};

export type ScoreWithId = Score & { id: string };

/** Trophy map: userId -> true. One trophy per user per post. */
export type GymFeedTrophies = Record<string, true>;

/** Gym activity feed item: /gyms/{gymId}/feed/{scoreId}. One doc per score (gym daily WOD only). */
export type GymFeedDoc = {
  gymId: string;
  workoutId: string;
  scoreId: string;
  athleteUid: string;
  athleteName: string;
  /** Optional profile photo URL for avatar in feed. */
  athletePhotoUrl?: string | null;
  division: string;
  scoreType: string;
  scoreValue: string;
  comment?: string | null;
  photoUrl?: string | null;
  workoutName?: string;
  /** Trophy reactions: userId -> true. Count = Object.keys(trophies).length */
  trophies?: GymFeedTrophies;
  createdAt: TimestampLike;
};

export type GymFeedDocWithId = GymFeedDoc & { id: string };

/** One item in the gym activity feed built from root collection `scores` + joined workout and display name. */
export type GymFeedItem = {
  score: ScoreWithId;
  workout: WorkoutWithId | null;
  /** Athlete display name: user firstName + lastName, or score.athleteName fallback. */
  displayName: string;
};

// ─── Benchmarks (Firestore: /benchmarks/{id}) ───────────────────────────────
export const BENCHMARK_CATEGORIES = ["girls", "hero", "1rm", "open", "custom"] as const;
export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];

export const BENCHMARK_SCORE_TYPES = ["time", "reps", "weight", "time_or_reps", "custom"] as const;
export type BenchmarkScoreType = (typeof BENCHMARK_SCORE_TYPES)[number];

export const BENCHMARK_TRACKS = ["rx", "scaled"] as const;
export type BenchmarkTrack = (typeof BENCHMARK_TRACKS)[number];

export type Benchmark = {
  name: string;
  nameLower: string;
  category: BenchmarkCategory;
  scoreType: BenchmarkScoreType;
  timeCapSeconds?: number | null;
  descriptionRx?: string | null;
  descriptionScaled?: string | null;
  defaultTrack: BenchmarkTrack;
  movements?: string[] | null;
  source: "seed" | "user";
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type BenchmarkWithId = Benchmark & { id: string };

// ─── Benchmark results (Firestore: users/{uid}/benchmark_results/{id}) ──────
export const BENCHMARK_RESULT_UNITS = ["lb", "kg"] as const;
export type BenchmarkResultUnit = (typeof BENCHMARK_RESULT_UNITS)[number];

export type BenchmarkResult = {
  benchmarkId: string;
  track: BenchmarkTrack;
  scoreType: BenchmarkScoreType;
  timeSeconds?: number | null;
  reps?: number | null;
  weight?: number | null;
  unit?: BenchmarkResultUnit | null;
  completedWithinTimeCap?: boolean | null;
  performedAt: TimestampLike;
  note?: string | null;
  /** Default true if absent (rétro-compat). When false, only owner sees this result. */
  isPublic?: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type BenchmarkResultWithId = BenchmarkResult & { id: string };

// ─── WOD (subcollection: gyms/{gymId}/wods/{wodId}) ─────────────────────────
/** Score type for WOD: time (lower better), reps/weight (higher better). */
export const WOD_SCORE_TYPES = ["time", "reps", "weight"] as const;
export type WodScoreType = (typeof WOD_SCORE_TYPES)[number];

/** Division for WOD leaderboard (one score per athlete per WOD). */
export const WOD_DIVISIONS = ["men_rx", "men_scaled", "women_rx", "women_scaled"] as const;
export type WodDivision = (typeof WOD_DIVISIONS)[number];

/** Default description view for athletes: RX or Scaled. */
export type WodDefaultTrack = "rx" | "scaled";

export type Wod = {
  title: string;
  /** @deprecated Use descriptionRx / descriptionScaled. Kept for migration. */
  description?: string;
  descriptionRx?: string;
  descriptionScaled?: string;
  defaultTrack?: WodDefaultTrack;
  /** Date du WOD (YYYY-MM-DD), optionnel */
  wodDate?: string;
  scoreType: WodScoreType;
  createdAt: TimestampLike;
  createdByUid: string;
  isPublished: boolean;
  eventId?: string | null; // nullable, link to event later
};

export type WodWithId = Wod & { id: string; gymId: string };

/** Score doc: gyms/{gymId}/wods/{wodId}/scores/{uid} — docId MUST be athlete uid (one score per WOD). */
export type WodScore = {
  uid: string; // athlete uid (same as doc id)
  displayName: string;
  firstName?: string;
  lastName?: string;
  division: WodDivision;
  value: number; // for ordering: time in seconds, reps/weight as number
  valueRaw?: string; // optional display string e.g. "3:45", "225 lb"
  /** When WOD scoreType is "reps": true = scored as reps (higher better), false = scored as time (lower better). */
  completedWithinTimeCap?: boolean;
  /** Optional caption for feed post (gym Daily WOD only). */
  caption?: string;
  /** Firebase Storage path for score photo (gym Daily WOD). */
  photoStoragePath?: string;
  /** Download URL for score photo. */
  photoUrl?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type WodScoreWithId = WodScore & { id: string };

// ─── Gym Activity Feed (gyms/{gymId}/feedPosts, replies, stars) ─────────────

/** Feed post: projection from score submission (created/updated by Cloud Function). postId = `${wodId}_${athleteId}`. Only Daily Gym WODs (no eventId). */
export type FeedPost = {
  gymId: string;
  wodId: string;
  scoreRefPath?: string;
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string;
  wodTitle: string;
  scoringType: WodScoreType;
  scoreDisplay: string;
  valueRaw?: string;
  /** Division for display badge (e.g. Femmes RX). */
  division?: string;
  caption?: string;
  photoUrl?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  repliesCount: number;
  starsCount: number;
  starsAvg: number;
};

export type FeedPostWithId = FeedPost & { id: string };

/** Reply: gyms/{gymId}/feedPosts/{postId}/replies/{replyId} */
export type FeedReply = {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: TimestampLike;
};

export type FeedReplyWithId = FeedReply & { id: string };

/** Star: gyms/{gymId}/feedPosts/{postId}/stars/{userId} — one doc per user, rating 1–5 */
export type FeedStar = {
  rating: number;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};
