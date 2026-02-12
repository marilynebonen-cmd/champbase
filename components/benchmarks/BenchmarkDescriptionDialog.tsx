"use client";

import { useState } from "react";
import type { BenchmarkWithId } from "@/types";
import { BENCHMARK_TRACKS, type BenchmarkTrack } from "@/types";
import { Button } from "@/components/ui/Button";

type BenchmarkDescriptionDialogProps = {
  benchmark: BenchmarkWithId;
  onClose: () => void;
};

const TRACK_LABELS: Record<BenchmarkTrack, string> = {
  rx: "RX",
  scaled: "Scaled",
};

/** Poids / 1RM : pas d’onglets RX vs Scaled, uniquement les WOD. */
const isWodWithTracks = (scoreType: string) =>
  scoreType === "time" || scoreType === "reps" || scoreType === "time_or_reps";

/**
 * Modal with RX / Scaled tabs for WODs; single description for weight (1RM).
 */
export function BenchmarkDescriptionDialog({
  benchmark,
  onClose,
}: BenchmarkDescriptionDialogProps) {
  const [track, setTrack] = useState<BenchmarkTrack>(benchmark.defaultTrack);
  const showTracks = isWodWithTracks(benchmark.scoreType);
  const content = showTracks
    ? track === "rx"
      ? benchmark.descriptionRx?.trim() || "Aucune description RX."
      : benchmark.descriptionScaled?.trim() || "Aucune description Scaled."
    : benchmark.descriptionRx?.trim() || benchmark.descriptionScaled?.trim() || "Aucune description.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="benchmark-desc-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--card-border)]">
          <h2 id="benchmark-desc-title" className="text-lg font-semibold truncate">
            {benchmark.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showTracks && (
          <div className="flex border-b border-[var(--card-border)]">
            {BENCHMARK_TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(t)}
                className={[
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  track === t
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent-muted)]/30"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]",
                ].join(" ")}
              >
                {TRACK_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="text-[var(--foreground)] whitespace-pre-wrap">{content}</div>
        </div>

        <div className="flex justify-end p-4 border-t border-[var(--card-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
