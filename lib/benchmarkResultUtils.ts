import type { BenchmarkResultWithId, BenchmarkScoreType } from "@/types";

/**
 * Returns the best result (PR) from a list of results for a given score type.
 * - time: lower timeSeconds is better
 * - reps / weight: higher is better
 * - time_or_reps: prefer lower time if present, else higher reps
 */
export function getBestResult(
  results: BenchmarkResultWithId[],
  scoreType: BenchmarkScoreType
): BenchmarkResultWithId | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0]!;

  switch (scoreType) {
    case "time":
      return results.reduce((best, r) => {
        const b = best.timeSeconds ?? Infinity;
        const v = r.timeSeconds ?? Infinity;
        return v < b ? r : best;
      });
    case "reps":
      return results.reduce((best, r) => {
        const b = best.reps ?? -Infinity;
        const v = r.reps ?? -Infinity;
        return v > b ? r : best;
      });
    case "weight":
      return results.reduce((best, r) => {
        const b = best.weight ?? -Infinity;
        const v = r.weight ?? -Infinity;
        return v > b ? r : best;
      });
    case "time_or_reps":
      return results.reduce((best, r) => {
        const hasTime = (x: BenchmarkResultWithId) => x.timeSeconds != null;
        if (hasTime(r) && hasTime(best)) {
          return (r.timeSeconds ?? Infinity) < (best.timeSeconds ?? Infinity) ? r : best;
        }
        if (hasTime(r)) return r;
        if (hasTime(best)) return best;
        return (r.reps ?? -Infinity) > (best.reps ?? -Infinity) ? r : best;
      });
    default:
      return results[0] ?? null;
  }
}

/** Format time seconds to mm:ss */
export function formatTimeSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format result for display (time, reps, or weight) */
export function formatResultValue(
  r: BenchmarkResultWithId,
  scoreType: BenchmarkScoreType
): string {
  switch (scoreType) {
    case "time":
      return formatTimeSeconds(r.timeSeconds);
    case "reps":
      return r.reps != null ? String(r.reps) : "—";
    case "weight":
      return r.weight != null ? `${r.weight} ${r.unit ?? "kg"}` : "—";
    case "time_or_reps":
      if (r.timeSeconds != null) return formatTimeSeconds(r.timeSeconds);
      if (r.reps != null) return String(r.reps);
      return "—";
    default:
      return "—";
  }
}
