/**
 * Event leaderboard: build matrix (rows = athletes, columns = WODs, total = placement points).
 * - Placement points: 1st = 1, 2nd = 2, … ; lowest total wins.
 * - Tie-breaker within a WOD: createdAt (earlier submission wins).
 */
import type { ScoreType } from "@/types";
import type { ScoreWithId } from "@/types";
import type { WorkoutWithId } from "@/types";
import type {
  AthleteRow,
  EventLeaderboardColumn,
  EventLeaderboardTable,
  WodCell,
} from "@/types/eventLeaderboard";
import type { Division } from "@/types";

/** Parse scoreValue to a number for ordering. Time -> seconds (lower better), REPS/WEIGHT -> number (higher better). */
export function scoreValueToNumber(
  scoreType: ScoreType,
  scoreValue: string
): number {
  const s = (scoreValue ?? "").trim();
  if (!s) return scoreType === "TIME" ? Infinity : -Infinity;
  switch (scoreType) {
    case "TIME": {
      const parts = s.split(":").map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      const single = parseFloat(s);
      return Number.isNaN(single) ? Infinity : single;
    }
    case "REPS":
    case "WEIGHT": {
      const n = parseFloat(s.replace(/,/g, "."));
      return Number.isNaN(n) ? -Infinity : n;
    }
    default:
      return 0;
  }
}

/** Compare two scores for ranking: returns true if a is better than b (a should rank before b). */
function isBetter(
  scoreType: ScoreType,
  aValue: number,
  aTime: number,
  bValue: number,
  bTime: number
): boolean {
  if (scoreType === "TIME") {
    if (aValue !== bValue) return aValue < bValue;
    return aTime < bTime; // tie-break: earlier submission wins
  }
  if (aValue !== bValue) return aValue > bValue;
  return aTime < bTime;
}

/** Get createdAt as number for tie-breaker. */
function getCreatedAtTime(score: ScoreWithId): number {
  const t = score.createdAt;
  if (t instanceof Date) return t.getTime();
  if (t && typeof t === "object" && "seconds" in t) return (t as { seconds: number }).seconds * 1000;
  return 0;
}

/**
 * Compute WOD ranking within a division: ordered list of (score, rank, points).
 * Rank 1-based; points = rank (1st=1, 2nd=2, …). Tie-break by createdAt.
 */
export function computeWodRanking(
  scores: ScoreWithId[],
  workoutId: string,
  scoreType: ScoreType
): { score: ScoreWithId; rank: number; points: number }[] {
  const forWod = scores.filter((s) => s.workoutId === workoutId);
  const withValue = forWod.map((s) => ({
    score: s,
    value: scoreValueToNumber(scoreType, s.scoreValue),
    createdAt: getCreatedAtTime(s),
  }));
  const lowerBetter = scoreType === "TIME";
  withValue.sort((a, b) => {
    const aBetter = isBetter(scoreType, a.value, a.createdAt, b.value, b.createdAt);
    if (aBetter) return -1;
    const bBetter = isBetter(scoreType, b.value, b.createdAt, a.value, a.createdAt);
    return bBetter ? 1 : 0;
  });
  return withValue.map((item, index) => ({
    score: item.score,
    rank: index + 1,
    points: index + 1,
  }));
}

/**
 * Build the event leaderboard table for one division.
 * Uses existing Firestore: events (top-level), workouts (top-level), scores (by leaderboardId).
 */
export function buildEventLeaderboard(
  workouts: WorkoutWithId[],
  scores: ScoreWithId[],
  division: Division
): EventLeaderboardTable {
  const columns: EventLeaderboardColumn[] = workouts.map((w) => ({
    workoutId: w.id,
    workoutName: w.name,
    scoreType: w.scoreType,
    unit: w.unit,
  }));

  const byDivision = scores.filter((s) => s.division === division);
  const athleteIds = [...new Set(byDivision.map((s) => s.athleteUid))];
  const athleteNames: Record<string, string> = {};
  byDivision.forEach((s) => {
    if (!athleteNames[s.athleteUid]) athleteNames[s.athleteUid] = s.athleteName || s.athleteUid;
  });

  const rankingByWod = new Map<string, { score: ScoreWithId; rank: number; points: number }[]>();
  for (const w of workouts) {
    const ranked = computeWodRanking(byDivision, w.id, w.scoreType);
    rankingByWod.set(w.id, ranked);
  }

  const rows: AthleteRow[] = athleteIds.map((athleteUid) => {
    const wodCells: Record<string, WodCell> = {};
    let totalPoints = 0;
    for (const w of workouts) {
      const ranking = rankingByWod.get(w.id) ?? [];
      const entry = ranking.find((r) => r.score.athleteUid === athleteUid);
      if (entry) {
        wodCells[w.id] = {
          rawScore: entry.score.scoreValue,
          rankInWod: entry.rank,
          points: entry.points,
          scoreDisplay: entry.score.scoreValue,
        };
        totalPoints += entry.points;
      } else {
        wodCells[w.id] = {
          rawScore: "",
          rankInWod: 0,
          points: 0,
          scoreDisplay: "—",
        };
      }
    }
    return {
      athleteUid,
      athleteName: athleteNames[athleteUid] ?? athleteUid,
      division,
      totalPoints,
      overallRank: 0,
      wodCells,
    };
  });

  rows.sort((a, b) => {
    if (a.totalPoints !== b.totalPoints) return a.totalPoints - b.totalPoints;
    for (const w of workouts) {
      const pa = a.wodCells[w.id]?.rankInWod ?? 999;
      const pb = b.wodCells[w.id]?.rankInWod ?? 999;
      if (pa !== pb) return pa - pb;
    }
    return 0;
  });

  rows.forEach((row, index) => {
    row.overallRank = index + 1;
  });

  return { columns, rows, division };
}
