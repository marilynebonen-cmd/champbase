/**
 * Score value validation by workout scoreType.
 * TIME: mm:ss or hh:mm:ss
 * WEIGHT: numeric (string)
 * REPS: integer
 */
import type { ScoreType } from "@/types";

export function validateScoreValue(
  scoreType: ScoreType,
  value: string
): { valid: boolean; message?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: "Score is required." };

  switch (scoreType) {
    case "TIME": {
      // mm:ss or hh:mm:ss
      const timeRe = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
      if (!timeRe.test(trimmed)) {
        return { valid: false, message: "Use mm:ss or hh:mm:ss (e.g. 5:30 or 1:05:30)." };
      }
      return { valid: true };
    }
    case "WEIGHT": {
      const n = parseFloat(trimmed);
      if (Number.isNaN(n) || trimmed !== String(n).trim()) {
        return { valid: false, message: "Enter a number (e.g. 225)." };
      }
      if (n < 0) return { valid: false, message: "Weight must be non-negative." };
      return { valid: true };
    }
    case "REPS": {
      const n = parseInt(trimmed, 10);
      if (Number.isNaN(n) || String(n) !== trimmed.trim()) {
        return { valid: false, message: "Enter a whole number (e.g. 120)." };
      }
      if (n < 0) return { valid: false, message: "Reps must be non-negative." };
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}
