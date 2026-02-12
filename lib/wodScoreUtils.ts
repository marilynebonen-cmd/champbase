/**
 * Parse and format WOD score values. time: mm:ss -> seconds; reps/weight: number.
 */
import type { WodScoreType, ScoreType, WodDefaultTrack } from "@/types";

/** WOD-like shape for description resolution (supports legacy description and RX/Scaled). */
export type WodDescriptionSource = {
  description?: string;
  descriptionRx?: string;
  descriptionScaled?: string;
  defaultTrack?: WodDefaultTrack;
};

/** Returns the description for a given track. Legacy: if only description exists, use for RX and empty for Scaled. */
export function getWodDisplayDescription(
  wod: WodDescriptionSource,
  track: WodDefaultTrack
): string {
  if (track === "rx") return wod.descriptionRx ?? wod.description ?? "";
  return wod.descriptionScaled ?? "";
}

export function parseWodValue(
  scoreType: WodScoreType,
  input: string
): { value: number; valueRaw: string } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Score requis." };

  switch (scoreType) {
    case "time": {
      const timeRe = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
      if (!timeRe.test(trimmed)) {
        return { error: "Utilisez mm:ss ou hh:mm:ss (ex: 5:30 ou 1:05:30)." };
      }
      const parts = trimmed.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      return { value: seconds, valueRaw: trimmed };
    }
    case "reps": {
      const n = parseInt(trimmed, 10);
      if (Number.isNaN(n) || String(n) !== trimmed) {
        return { error: "Entrez un nombre entier (ex: 120)." };
      }
      if (n < 0) return { error: "Les reps doivent être ≥ 0." };
      return { value: n, valueRaw: trimmed };
    }
    case "weight": {
      const n = parseFloat(trimmed);
      if (Number.isNaN(n)) return { error: "Entrez un nombre (ex: 225)." };
      if (n < 0) return { error: "Le poids doit être ≥ 0." };
      return { value: n, valueRaw: trimmed };
    }
    default:
      return { value: 0, valueRaw: trimmed };
  }
}

export function formatWodValue(scoreType: WodScoreType, value: number, valueRaw?: string): string {
  if (valueRaw != null && valueRaw !== "") return valueRaw;
  switch (scoreType) {
    case "time": {
      const m = Math.floor(value / 60);
      const s = Math.floor(value % 60);
      return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
    }
    case "reps":
    case "weight":
      return String(value);
    default:
      return String(value);
  }
}

/** Pour l’affichage uniquement : valeur + " lbs" pour le type weight. Ne pas utiliser pour le stockage. */
export function formatWodValueWithUnit(scoreType: WodScoreType, value: number, valueRaw?: string): string {
  const base = formatWodValue(scoreType, value, valueRaw);
  if (scoreType === "weight") return `${base} lbs`;
  return base;
}

/** Display string for feed: time as m:ss, reps as integer, weight with " lbs". */
export function formatWodValueForFeed(scoreType: WodScoreType, value: number, valueRaw?: string): string {
  const raw = valueRaw != null && valueRaw !== "" ? valueRaw : String(value);
  if (scoreType === "time") {
    if (valueRaw != null && valueRaw !== "") return valueRaw;
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  }
  if (scoreType === "weight") return `${formatWodValue(scoreType, value, valueRaw)} lbs`;
  return raw;
}

/** French label for scoring type (feed and WOD page). */
export const SCORING_TYPE_LABELS: Record<WodScoreType, string> = {
  time: "Temps (plus bas = mieux)",
  reps: "Reps (plus haut = mieux)",
  weight: "Poids (plus haut = mieux)",
};

/** Format root collection score (ScoreType) for gym feed: value + unit label. Weight always displayed as " lbs". */
export function formatScoreForFeed(scoreType: ScoreType, scoreValue: string): string {
  if (!scoreValue?.trim()) return "—";
  const v = scoreValue.trim().replace(/\s*(lbs?|kg)\s*$/i, "").trim();
  switch (scoreType) {
    case "REPS":
      return `${v} reps`;
    case "TIME":
      return scoreValue.trim();
    case "WEIGHT":
      return v ? `${v} lbs` : "—";
    default:
      return scoreValue.trim();
  }
}
