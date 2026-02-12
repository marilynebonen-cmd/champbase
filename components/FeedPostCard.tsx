"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import {
  subscribeReplies,
  subscribeMyStar,
  addReply,
  setStar,
} from "@/lib/firestore/feed";
import { SCORING_TYPE_LABELS } from "@/lib/wodScoreUtils";
import type { FeedPostWithId, FeedReplyWithId, FeedStar } from "@/types";
import type { WodScoreType } from "@/types";

const FEED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

function toDate(value: Date | { seconds: number; nanoseconds?: number } | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const s = (value as { seconds: number }).seconds;
  return new Date(s * 1000);
}

function formatFeedDate(date: Date): string {
  return date.toLocaleString("fr-CA", FEED_DATE_OPTIONS);
}

/** Relative time in French (Strava-style): "il y a 2 min", "il y a 3 h", "il y a 2 j" */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffJ = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffJ < 7) return `il y a ${diffJ} j`;
  return formatFeedDate(date);
}

type PostCardProps = {
  post: FeedPostWithId;
  gymId: string;
  currentUserId: string | null;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
};

export function FeedPostCard({
  post,
  gymId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: PostCardProps) {
  const [replies, setReplies] = useState<FeedReplyWithId[]>([]);
  const [myStar, setMyStar] = useState<FeedStar | null>(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingStar, setSubmittingStar] = useState(false);

  // Only subscribe to replies when authenticated (rules require request.auth for replies read)
  useEffect(() => {
    if (!currentUserId) {
      setReplies([]);
      return;
    }
    const unsubReplies = subscribeReplies(gymId, post.id, setReplies);
    return () => unsubReplies();
  }, [gymId, post.id, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeMyStar(gymId, post.id, currentUserId, setMyStar);
    return () => unsub();
  }, [gymId, post.id, currentUserId]);

  async function handleSubmitReply(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await addReply(gymId, post.id, {
        userId: currentUserId,
        userName: currentUserName,
        userAvatarUrl: currentUserAvatarUrl ?? undefined,
        text: replyText.trim(),
      });
      setReplyText("");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleSetStar(rating: number) {
    if (!currentUserId) return;
    setSubmittingStar(true);
    try {
      await setStar(gymId, post.id, currentUserId, rating);
    } finally {
      setSubmittingStar(false);
    }
  }

  const scoringLabel = SCORING_TYPE_LABELS[post.scoringType as WodScoreType] ?? post.scoringType;

  const updatedAtDate = toDate(post.updatedAt as Date | { seconds: number });

  return (
    <Card className="overflow-hidden">
      {/* Header – Strava-style: avatar + name + relative time */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar
          photoURL={post.athleteAvatarUrl}
          displayName={post.athleteName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)] truncate">
            {post.athleteName}
          </p>
          <p className="text-[var(--muted)] text-sm">
            {formatRelativeTime(updatedAtDate)}
          </p>
        </div>
      </div>

      {/* Body – "a soumis un score sur {WOD_TITLE}" + score + division + caption + photo */}
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[var(--foreground)]">
          a soumis un score sur <span className="font-medium">{post.wodTitle}</span>
        </p>
        <p className="text-sm text-[var(--muted)]">{scoringLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-[var(--accent)]">{post.scoreDisplay}</p>
          {post.division && (
            <span className="rounded-md px-2.5 py-1 text-xs font-medium bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]">
              {post.division}
            </span>
          )}
        </div>
        {post.caption && (
          <p className="text-[var(--foreground)] whitespace-pre-wrap">{post.caption}</p>
        )}
        {post.photoUrl && (
          <a
            href={post.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border border-[var(--card-border)]"
          >
            <img
              src={post.photoUrl}
              alt=""
              className="w-full max-h-80 object-cover"
            />
          </a>
        )}
      </div>

      {/* Footer: stars + replies count */}
      <div className="px-4 py-2 border-t border-[var(--card-border)] flex flex-wrap items-center gap-4">
        {/* Stars: 1–5, only if authenticated */}
        {currentUserId && (
          <div className="flex items-center gap-1">
            <span className="text-[var(--muted)] text-sm mr-1">Étoiles :</span>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                disabled={submittingStar}
                onClick={() => handleSetStar(r)}
                className={`rounded p-1 text-lg leading-none transition-colors ${
                  myStar && myStar.rating >= r
                    ? "text-[var(--accent)]"
                    : "text-[var(--card-border)] hover:text-[var(--accent)]"
                }`}
                aria-label={`${r} étoile${r > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
            {(post.starsCount > 0 || (myStar && myStar.rating > 0)) && (
              <span className="text-[var(--muted)] text-sm ml-1">
                ({post.starsAvg.toFixed(1)}, {post.starsCount} vote{post.starsCount !== 1 ? "s" : ""})
              </span>
            )}
          </div>
        )}
        {!currentUserId && post.starsCount > 0 && (
          <span className="text-[var(--muted)] text-sm">
            {post.starsAvg.toFixed(1)} ★ ({post.starsCount} vote{post.starsCount !== 1 ? "s" : ""})
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowReplies((v) => !v)}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          {post.repliesCount} commentaire{post.repliesCount !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Replies section */}
      {showReplies && (
        <div className="px-4 pb-4 border-t border-[var(--card-border)] pt-3 space-y-3">
          <ul className="space-y-2">
            {replies.map((r) => (
              <li key={r.id} className="flex gap-2">
                <Avatar
                  photoURL={r.userAvatarUrl}
                  displayName={r.userName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{r.userName}</p>
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{r.text}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatFeedDate(toDate(r.createdAt as Date | { seconds: number }))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {currentUserId && (
            <form onSubmit={handleSubmitReply} className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ajouter un commentaire…"
                className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="rounded-lg bg-[var(--accent)] text-black px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
