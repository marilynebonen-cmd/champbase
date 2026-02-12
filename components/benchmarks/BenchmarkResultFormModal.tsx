"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type {
  BenchmarkWithId,
  BenchmarkResultWithId,
  BenchmarkTrack,
  BenchmarkScoreType,
  BenchmarkResultUnit,
} from "@/types";
import { BENCHMARK_TRACKS, BENCHMARK_RESULT_UNITS } from "@/types";

type BenchmarkResultFormModalProps = {
  benchmark: BenchmarkWithId;
  /** When provided, we're editing; otherwise creating. */
  existingResult?: BenchmarkResultWithId | null;
  onSave: () => void;
  onCancel: () => void;
  /** Called with the payload to create or update (resultId when editing). */
  onSubmit: (
    data: {
      track: BenchmarkTrack;
      scoreType: BenchmarkScoreType;
      timeSeconds?: number | null;
      reps?: number | null;
      weight?: number | null;
      unit?: BenchmarkResultUnit | null;
      completedWithinTimeCap?: boolean | null;
      performedAt: Date;
      note?: string | null;
    },
    resultId?: string
  ) => Promise<void>;
};

const TRACK_LABELS: Record<BenchmarkTrack, string> = { rx: "RX", scaled: "Scaled" };

/** Parse "mm:ss" or "m:ss" to seconds. */
function parseTimeToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 1 && !Number.isNaN(parts[0])) return parts[0]!;
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0]! * 60 + parts[1]!;
  }
  return null;
}

function formatTimeFromSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BenchmarkResultFormModal({
  benchmark,
  existingResult,
  onSave,
  onCancel,
  onSubmit,
}: BenchmarkResultFormModalProps) {
  const isEdit = !!existingResult;
  const [track, setTrack] = useState<BenchmarkTrack>(
    existingResult?.track ?? benchmark.defaultTrack
  );
  const [timeInput, setTimeInput] = useState(
    formatTimeFromSeconds(existingResult?.timeSeconds ?? undefined)
  );
  const [repsInput, setRepsInput] = useState(
    existingResult?.reps != null ? String(existingResult.reps) : ""
  );
  const [weightInput, setWeightInput] = useState(
    existingResult?.weight != null ? String(existingResult.weight) : ""
  );
  const [unit, setUnit] = useState<BenchmarkResultUnit>(
    (existingResult?.unit as BenchmarkResultUnit) ?? "kg"
  );
  const [completedWithinTimeCap, setCompletedWithinTimeCap] = useState(
    existingResult?.completedWithinTimeCap ?? true
  );
  const [performedAt, setPerformedAt] = useState(() => {
    const d = existingResult?.performedAt;
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    if (d && typeof (d as { seconds?: number }).seconds === "number") {
      return new Date((d as { seconds: number }).seconds * 1000).toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [note, setNote] = useState(existingResult?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreType = benchmark.scoreType;
  const hasTimeCap = benchmark.timeCapSeconds != null && benchmark.timeCapSeconds > 0;

  function getPayload() {
    const performedAtDate = new Date(performedAt);
    if (isNaN(performedAtDate.getTime())) {
      setError("Date invalide.");
      return null;
    }

    const base = {
      track,
      scoreType,
      performedAt: performedAtDate,
      note: note.trim() || null,
    };

    if (scoreType === "time" || scoreType === "time_or_reps") {
      const timeSeconds = parseTimeToSeconds(timeInput);
      if (timeSeconds === null && timeInput.trim() !== "") {
        setError("Temps invalide (ex: 5:30).");
        return null;
      }
      return {
        ...base,
        timeSeconds: timeSeconds ?? null,
        reps: scoreType === "time_or_reps" ? (repsInput.trim() ? parseInt(repsInput, 10) : null) : null,
        weight: null,
        unit: null,
        completedWithinTimeCap: hasTimeCap ? completedWithinTimeCap : null,
      };
    }

    if (scoreType === "reps") {
      const reps = repsInput.trim() ? parseInt(repsInput, 10) : null;
      if (reps !== null && Number.isNaN(reps)) {
        setError("Reps invalide.");
        return null;
      }
      return {
        ...base,
        timeSeconds: null,
        reps,
        weight: null,
        unit: null,
        completedWithinTimeCap: null,
      };
    }

    if (scoreType === "weight") {
      const weight = weightInput.trim() ? parseFloat(weightInput) : null;
      if (weight !== null && (Number.isNaN(weight) || weight <= 0)) {
        setError("Poids invalide.");
        return null;
      }
      return {
        ...base,
        timeSeconds: null,
        reps: null,
        weight,
        unit: weight != null ? unit : null,
        completedWithinTimeCap: null,
      };
    }

    return {
      ...base,
      timeSeconds: null,
      reps: null,
      weight: null,
      unit: null,
      completedWithinTimeCap: null,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = getPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await onSubmit(payload as Parameters<typeof onSubmit>[0], existingResult?.id);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="benchmark-result-form-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--card-border)]">
          <h2 id="benchmark-result-form-title" className="text-lg font-semibold">
            {isEdit ? "Modifier le résultat" : "Entrer un résultat"} — {benchmark.name}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--card-hover)]"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* RX/Scaled uniquement pour les WOD (pas pour les 1RM / poids) */}
          {scoreType !== "weight" && (
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Track</label>
              <div className="flex gap-2">
                {BENCHMARK_TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={[
                      "rounded-lg px-4 py-2 text-sm font-medium",
                      track === t
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                        : "bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    {TRACK_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(scoreType === "time" || scoreType === "time_or_reps") && (
            <div>
              <label htmlFor="result-time" className="block text-sm font-medium text-[var(--muted)] mb-1">
                Temps (mm:ss)
              </label>
              <input
                id="result-time"
                type="text"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="5:30"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
              />
            </div>
          )}

          {(scoreType === "reps" || scoreType === "time_or_reps") && (
            <div>
              <label htmlFor="result-reps" className="block text-sm font-medium text-[var(--muted)] mb-1">
                Reps / Rounds
              </label>
              <input
                id="result-reps"
                type="number"
                min={0}
                value={repsInput}
                onChange={(e) => setRepsInput(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
              />
            </div>
          )}

          {scoreType === "weight" && (
            <>
              <div>
                <label htmlFor="result-weight" className="block text-sm font-medium text-[var(--muted)] mb-1">
                  Poids
                </label>
                <input
                  id="result-weight"
                  type="number"
                  min={0}
                  step={0.5}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">Unité</label>
                <div className="flex gap-2">
                  {BENCHMARK_RESULT_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={[
                        "rounded-lg px-4 py-2 text-sm font-medium",
                        unit === u
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "bg-[var(--background)] border border-[var(--card-border)]",
                      ].join(" ")}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {hasTimeCap && (scoreType === "time" || scoreType === "time_or_reps") && (
            <div className="flex items-center gap-2">
              <input
                id="result-timecap"
                type="checkbox"
                checked={completedWithinTimeCap}
                onChange={(e) => setCompletedWithinTimeCap(e.target.checked)}
                className="rounded border-[var(--card-border)] accent-[var(--accent)]"
              />
              <label htmlFor="result-timecap" className="text-sm text-[var(--foreground)]">
                Complété dans le time cap
              </label>
            </div>
          )}

          <div>
            <label htmlFor="result-date" className="block text-sm font-medium text-[var(--muted)] mb-1">
              Date
            </label>
            <input
              id="result-date"
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
            />
          </div>

          <div>
            <label htmlFor="result-note" className="block text-sm font-medium text-[var(--muted)] mb-1">
              Note (optionnel)
            </label>
            <input
              id="result-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="—"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
