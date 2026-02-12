"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedEvents, getEventsByCreator, getLeaderboardsByEvent, getScoresByLeaderboard } from "@/lib/db";
import type { EventWithId } from "@/types";
import type { LeaderboardWithId } from "@/types";
import type { ScoreWithId } from "@/types";
import { SubmitScoreForm } from "@/app/athlete/leaderboards/SubmitScoreForm";

/**
 * Leaderboards list with filters (event, workout, division) + Submit score.
 */
function LeaderboardsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const submitOpen = searchParams.get("submit") === "1";
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<LeaderboardWithId[]>([]);
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedEvents()
      .then((published) => {
        setEvents(published);
        if (published.length === 0 && user?.uid) {
          getEventsByCreator(user.uid)
            .then((mine) => setEvents(mine))
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("[Leaderboards] getPublishedEvents failed:", err);
        if (user?.uid) {
          getEventsByCreator(user.uid).then(setEvents).catch(() => setEvents([]));
        } else {
          setEvents([]);
        }
      })
      .finally(() => setLoading(false));
    const e = searchParams.get("eventId");
    const lb = searchParams.get("leaderboardId");
    if (e) setSelectedEventId(e);
    if (lb) setSelectedLeaderboardId(lb);
  }, [user?.uid, searchParams]);

  useEffect(() => {
    if (!selectedEventId) {
      setLeaderboards([]);
      return;
    }
    getLeaderboardsByEvent(selectedEventId).then(setLeaderboards);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedLeaderboardId) {
      setScores([]);
      return;
    }
    getScoresByLeaderboard(selectedLeaderboardId).then(setScores);
  }, [selectedLeaderboardId]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Leaderboards</h1>

      <p className="mb-6">
        <Link
          href="/scores/submit"
          className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 inline-block"
        >
          Submit score
        </Link>
      </p>

      {submitOpen && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Submit score</h2>
          <SubmitScoreForm
            events={events}
            leaderboards={leaderboards}
            onSelectEvent={(id) => {
              setSelectedEventId(id || null);
              setSelectedLeaderboardId(null);
            }}
            onSelectLeaderboard={setSelectedLeaderboardId}
          />
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4">Browse</h2>
        {loading ? (
          <p className="text-[var(--muted)]">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event</label>
              <select
                value={selectedEventId ?? ""}
                onChange={(e) => setSelectedEventId(e.target.value || null)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="">Select event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
            {selectedEventId && (
              <div>
                <label className="block text-sm font-medium mb-2">Leaderboard</label>
                <select
                  value={selectedLeaderboardId ?? ""}
                  onChange={(e) => setSelectedLeaderboardId(e.target.value || null)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                >
                  <option value="">Select leaderboard</option>
                  {leaderboards.map((lb) => (
                    <option key={lb.id} value={lb.id}>
                      {lb.division}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedLeaderboardId && (
              <div className="mt-4">
                <Link
                  href={`/leaderboards/${selectedLeaderboardId}`}
                  className="text-[var(--accent)] font-semibold hover:underline"
                >
                  View full leaderboard →
                </Link>
                {scores.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {scores.slice(0, 5).map((s) => (
                      <li key={s.id} className="text-[var(--muted)] text-sm">
                        {s.athleteName} · {s.scoreValue}
                      </li>
                    ))}
                    {scores.length > 5 && (
                      <li className="text-[var(--muted)] text-sm">
                        <Link href={`/leaderboards/${selectedLeaderboardId}`} className="text-[var(--accent)]">
                          +{scores.length - 5} more
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <p className="mt-4">
        <Link href="/events" className="text-[var(--accent)] hover:underline">
          View all events
        </Link>
      </p>
    </Layout>
  );
}

export default function LeaderboardsPage() {
  return (
    <ProtectedRoute>
      <LeaderboardsContent />
    </ProtectedRoute>
  );
}
