"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import {
  getLeaderboard,
  getEvent,
  getWorkout,
  getWorkoutsByEvent,
  getScoresByLeaderboard,
} from "@/lib/db";
import type { LeaderboardWithId, EventWithId, WorkoutWithId, ScoreWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

/**
 * Leaderboard detail. Event-level: one leaderboard, filters by WOD and category (M_RX, etc.).
 */
function LeaderboardDetailContent() {
  const params = useParams();
  const leaderboardId = params.leaderboardId as string;
  const [leaderboard, setLeaderboard] = useState<LeaderboardWithId | null>(null);
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [workout, setWorkout] = useState<WorkoutWithId | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutWithId[]>([]);
  const [scores, setScores] = useState<ScoreWithId[]>([]);
  const [filterWorkoutId, setFilterWorkoutId] = useState<string>("");
  const [filterDivision, setFilterDivision] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEventLeaderboard = leaderboard?.workoutId == null;

  useEffect(() => {
    if (!leaderboardId) return;
    getLeaderboard(leaderboardId)
      .then((lb) => {
        setLeaderboard(lb ?? null);
        if (lb) {
          if (lb.eventId) {
            getEvent(lb.eventId).then(setEvent);
            getWorkoutsByEvent(lb.eventId).then(setWorkouts);
          }
          if (lb.workoutId != null && lb.workoutId !== "")
            getWorkout(lb.workoutId).then(setWorkout);
          getScoresByLeaderboard(lb.id).then(setScores);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [leaderboardId]);

  const filteredScores = useMemo(() => {
    if (!scores.length) return [];
    let list = scores;
    if (isEventLeaderboard && filterWorkoutId) {
      list = list.filter((s) => s.workoutId === filterWorkoutId);
    }
    if (isEventLeaderboard && filterDivision) {
      list = list.filter((s) => s.division === filterDivision);
    }
    return list;
  }, [scores, isEventLeaderboard, filterWorkoutId, filterDivision]);

  if (loading && !leaderboard) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }
  if (error || !leaderboard) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">{error ?? "Leaderboard introuvable."}</p>
        <Link href="/leaderboards" className="text-[var(--accent)] mt-4 inline-block hover:underline">
          ← Leaderboards
        </Link>
      </Layout>
    );
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-CA", { dateStyle: "short" });

  return (
    <Layout>
      <Link href="/leaderboards" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Leaderboards
      </Link>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold">{event?.title ?? "Event"}</h1>
        {isEventLeaderboard ? (
          <span className="text-[var(--muted)] text-sm">
            Classement unique · Filtres : WOD, Catégorie
          </span>
        ) : (
          <>
            <span className="text-[var(--muted)]">·</span>
            <span className="font-semibold">{workout?.name ?? "Workout"}</span>
            {workout && (
              <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                {workout.scoreType} ({workout.unit})
              </span>
            )}
            {leaderboard.division != null && (
              <span className="rounded px-2 py-0.5 text-sm font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                {leaderboard.division}
              </span>
            )}
          </>
        )}
      </div>

      {isEventLeaderboard && (workouts.length > 0 || DIVISIONS.length > 0) && (
        <Card className="mb-4">
          <p className="text-sm font-medium text-[var(--muted)] mb-2">Filtres</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm">WOD</span>
              <select
                value={filterWorkoutId}
                onChange={(e) => setFilterWorkoutId(e.target.value)}
                className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
              >
                <option value="">Tous</option>
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm">Catégorie</span>
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
              >
                <option value="">Toutes</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-[var(--muted)]">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Athlète</th>
                {isEventLeaderboard && workouts.length > 1 && <th className="pb-2 pr-4">WOD</th>}
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2">Soumis le</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                    Aucun score pour ces filtres.
                  </td>
                </tr>
              ) : (
                filteredScores.map((s, i) => {
                  const w = workouts.find((wr) => wr.id === s.workoutId);
                  return (
                    <tr key={s.id} className="border-b border-[var(--card-border)]">
                      <td className="py-2 pr-4 font-medium">{i + 1}</td>
                      <td className="py-2 pr-4">{s.athleteName}</td>
                      {isEventLeaderboard && workouts.length > 1 && (
                        <td className="py-2 pr-4">{w?.name ?? s.workoutId}</td>
                      )}
                      <td className="py-2 pr-4">{s.scoreValue}</td>
                      <td className="py-2">
                        {s.createdAt instanceof Date
                          ? formatDate(s.createdAt)
                          : ""}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <Link
          href={`/scores/submit?leaderboardId=${leaderboardId}${filterWorkoutId ? `&workoutId=${filterWorkoutId}` : ""}${filterDivision ? `&division=${filterDivision}` : ""}`}
          className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
        >
          Soumettre un score
        </Link>
      </Card>
    </Layout>
  );
}

export default function LeaderboardDetailPage() {
  return <LeaderboardDetailContent />;
}
