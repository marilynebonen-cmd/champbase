"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { toggleTrophy } from "@/lib/firestore/gymFeed";
import type { GymFeedDocWithId } from "@/types";

function toDate(value: Date | { seconds: number; nanoseconds?: number } | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const s = (value as { seconds: number }).seconds;
  return new Date(s * 1000);
}

/** Relative time: "il y a 2 min", "il y a 3 h", "14:30" for today, or short date */
function formatTime(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  }
  const diffJ = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffJ < 7) return `il y a ${diffJ} j`;
  return date.toLocaleDateString("fr-CA", { dateStyle: "short" });
}

type ActivityCardProps = {
  item: GymFeedDocWithId;
  gymId: string;
  currentUserId: string | null;
};

export function ActivityCard({ item, gymId, currentUserId }: ActivityCardProps) {
  const [toggling, setToggling] = useState(false);
  const createdAtDate = toDate(item.createdAt);
  const trophyCount = item.trophies ? Object.keys(item.trophies).length : 0;
  const hasGivenTrophy = Boolean(currentUserId && item.trophies?.[currentUserId]);

  async function handleTrophyClick() {
    if (!currentUserId || toggling) return;
    setToggling(true);
    try {
      await toggleTrophy(gymId, item.id, currentUserId);
    } finally {
      setToggling(false);
    }
  }

  return (
    <article
      className="rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-lg overflow-hidden transition-transform duration-150 hover:scale-[1.01]"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
    >
      {/* Header: avatar + name + time */}
      <div className="flex items-start gap-4 p-5">
        <Avatar
          photoURL={item.athletePhotoUrl}
          displayName={item.athleteName}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold text-[var(--foreground)] text-lg truncate">
              {item.athleteName || "Athlète"}
            </h3>
            <time
              className="text-sm text-[var(--muted)] shrink-0"
              dateTime={createdAtDate.toISOString()}
            >
              {formatTime(createdAtDate)}
            </time>
          </div>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {item.workoutName ?? "WOD"}
          </p>
        </div>
      </div>

      {/* Body: score + division + comment + photo */}
      <div className="px-5 pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold text-[var(--accent)]">
            {item.scoreValue}
          </span>
          {item.division && (
            <span className="rounded-lg px-2.5 py-1 text-xs font-medium bg-[var(--background)] text-[var(--muted)] border border-[var(--card-border)]">
              {item.division}
            </span>
          )}
          <span className="text-sm text-[var(--muted)]">{item.scoreType}</span>
        </div>
        {item.comment && (
          <p className="text-[var(--foreground)] text-sm whitespace-pre-wrap">
            {item.comment}
          </p>
        )}
        {item.photoUrl && (
          <a
            href={item.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-[var(--card-border)] ring-offset-2 ring-offset-[var(--background)] hover:ring-2 hover:ring-[var(--accent)]/50 transition-all duration-150 hover:scale-[1.02]"
          >
            <img
              src={item.photoUrl}
              alt=""
              className="w-full max-h-80 object-cover"
            />
          </a>
        )}
      </div>

      {/* Footer: trophy section */}
      <div className="px-5 py-3 border-t border-[var(--card-border)] flex items-center gap-3">
        <span className="text-[var(--muted)] text-sm flex items-center gap-1.5">
          <span aria-hidden>🏆</span>
          <span>{trophyCount}</span>
        </span>
        {currentUserId && (
          <button
            type="button"
            onClick={handleTrophyClick}
            disabled={toggling}
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium
              transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100
              ${hasGivenTrophy
                ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--card-border-hover)]"
                : "border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/50"
              }
            `}
            aria-label={hasGivenTrophy ? "Retirer mon trophée" : "Féliciter"}
          >
            <span aria-hidden>🏆</span>
            {hasGivenTrophy ? "Trophée donné" : "Féliciter"}
          </button>
        )}
      </div>
    </article>
  );
}
