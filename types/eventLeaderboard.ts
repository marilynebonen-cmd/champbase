/**
 * Event leaderboard (Competition Corner style):
 * - One table per division: rows = athletes, columns = WODs, total = placement points.
 * - Placement points: 1st = 1, 2nd = 2, … ; lowest total wins.
 * - Tie-breaker within a WOD: createdAt (earlier submission wins).
 */

import type { Division } from "./index";
import type { WorkoutWithId } from "./index";
import type { ScoreWithId } from "./index";

/** Raw score submission for one athlete in one WOD (event score doc). */
export type ScoreSubmission = ScoreWithId;

/** Division filter for the event leaderboard table. */
export type DivisionId = Division;

/** One cell in the event leaderboard: athlete's result for one WOD. */
export type WodCell = {
  rawScore: string;
  /** 1-based rank within this WOD (division). */
  rankInWod: number;
  /** Placement points (1st=1, 2nd=2, …). */
  points: number;
  /** For display: e.g. "3:45" or "120 reps". */
  scoreDisplay?: string;
};

/** One row in the event leaderboard: one athlete and their results per WOD + total. */
export type AthleteRow = {
  athleteUid: string;
  athleteName: string;
  division: Division;
  /** Total placement points across all WODs (lower is better). */
  totalPoints: number;
  /** 1-based overall rank in this division. */
  overallRank: number;
  /** Per-WOD results: key = workoutId. */
  wodCells: Record<string, WodCell>;
};

/** Column descriptor for the table (one per event WOD). */
export type EventLeaderboardColumn = {
  workoutId: string;
  workoutName: string;
  scoreType: "REPS" | "TIME" | "WEIGHT";
  unit?: string;
};

/** Full event leaderboard matrix for one division. */
export type EventLeaderboardTable = {
  columns: EventLeaderboardColumn[];
  rows: AthleteRow[];
  division: Division;
};
