"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getPublishedEvents,
  getEventsByCreator,
  getWorkoutsByEvent,
  getLeaderboardByEvent,
  getUser,
  submitScore,
} from "@/lib/db";
import { validateScoreValue } from "@/lib/scoreValidation";
import { uploadRootScorePhoto } from "@/lib/storage";
import type { EventWithId, WorkoutWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

/**
 * Soumettre un score (événement uniquement) : Événement → WOD → Catégorie → Score.
 * Does NOT write to gym feed; gym activity feed is populated only by gym daily WOD submissions (non-event).
 */
function SubmitScoreContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [eventId, setEventId] = useState("");
  const [workouts, setWorkouts] = useState<WorkoutWithId[]>([]);
  const [workoutId, setWorkoutId] = useState("");
  const [division, setDivision] = useState<Division>("M_RX");
  const [scoreValue, setScoreValue] = useState("");
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        console.error("[Submit score] getPublishedEvents failed:", err);
        if (user?.uid) {
          getEventsByCreator(user.uid).then(setEvents).catch(() => setEvents([]));
        } else {
          setEvents([]);
        }
      })
      .finally(() => setLoadingEvents(false));
    const e = searchParams.get("eventId");
    if (e) setEventId(e);
  }, [searchParams, user?.uid]);

  useEffect(() => {
    if (!eventId) {
      setWorkouts([]);
      setWorkoutId("");
      setLoadingWorkouts(false);
      return;
    }
    setLoadingWorkouts(true);
    getWorkoutsByEvent(eventId)
      .then(setWorkouts)
      .catch(() => setWorkouts([]))
      .finally(() => setLoadingWorkouts(false));
    setWorkoutId("");
  }, [eventId]);

  const selectedWorkout = workouts.find((w) => w.id === workoutId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!eventId || !workoutId || !selectedWorkout) {
      setError("Sélectionnez un événement, un WOD et une catégorie.");
      return;
    }
    const validation = validateScoreValue(selectedWorkout.scoreType, scoreValue);
    if (!validation.valid) {
      setError(validation.message ?? "Score invalide.");
      return;
    }
    setSubmitting(true);
    try {
      const leaderboard = await getLeaderboardByEvent(eventId);
      if (!leaderboard) {
        setError("Cet événement n'a pas encore de classement. Créez d'abord des WODs.");
        setSubmitting(false);
        return;
      }
      const profile = await getUser(user.uid);
      const athleteName =
        profile?.displayName ??
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ??
        user.email ??
        "";
      let photoUrl: string | undefined;
      if (photoFile) {
        const { downloadUrl } = await uploadRootScorePhoto(
          selectedWorkout.gymId,
          user.uid,
          photoFile
        );
        photoUrl = downloadUrl;
      }
      await submitScore({
        gymId: selectedWorkout.gymId,
        isEventScore: true,
        eventId: selectedWorkout.eventId ?? eventId,
        leaderboardId: leaderboard.id,
        workoutId: selectedWorkout.id,
        athleteUid: user.uid,
        athleteName,
        division,
        scoreType: selectedWorkout.scoreType,
        scoreValue: scoreValue.trim(),
        submittedByUid: user.uid,
        submissionType: "athlete",
        comment: comment.trim() || undefined,
        photoUrl,
      });
      addToast("Score enregistré.");
      router.push(`/leaderboards/${leaderboard.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <Link href="/leaderboards" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Classements
      </Link>
      <h1 className="text-3xl font-bold mb-2">Soumettre un score</h1>
      <p className="text-[var(--muted)] mb-6">
        Choisissez l&apos;événement, le WOD, votre catégorie et saisissez votre score.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">1. Événement *</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Sélectionner un événement</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                  {ev.startDate instanceof Date
                    ? ` · ${ev.startDate.toLocaleDateString("fr-FR")}`
                    : ""}
                </option>
              ))}
            </select>
            {loadingEvents && <p className="text-[var(--muted)] text-sm mt-1">Chargement…</p>}
            {!loadingEvents && events.length === 0 && (
              <p className="text-[var(--muted)] text-sm mt-1">Aucun événement publié.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">2. WOD (workout) *</label>
            {!eventId ? (
              <p className="text-[var(--muted)] text-sm">Sélectionnez d&apos;abord un événement.</p>
            ) : (
              <>
                <select
                  value={workoutId}
                  onChange={(e) => setWorkoutId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                >
                  <option value="">Sélectionner un WOD</option>
                  {workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {w.scoreType} ({w.unit})
                    </option>
                  ))}
                </select>
                {loadingWorkouts && <p className="text-[var(--muted)] text-sm mt-1">Chargement…</p>}
                {!loadingWorkouts && eventId && workouts.length === 0 && (
                  <p className="text-[var(--muted)] text-sm mt-1">Aucun WOD pour cet événement.</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">3. Catégorie *</label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value as Division)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              4. Score *
              {selectedWorkout && (
                <span className="text-[var(--muted)] font-normal ml-1">
                  (type : {selectedWorkout.scoreType}, unité : {selectedWorkout.unit})
                </span>
              )}
            </label>
            <input
              type="text"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              placeholder={
                selectedWorkout?.scoreType === "TIME"
                  ? "mm:ss ou hh:mm:ss (ex. 5:30)"
                  : selectedWorkout?.scoreType === "WEIGHT"
                    ? "ex. 225"
                    : "ex. 120"
              }
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">5. Commentaire (optionnel)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajoutez un commentaire pour le fil d'activité du club…"
              rows={3}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">6. Photo (optionnel)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
            {photoFile && (
              <p className="text-[var(--muted)] text-sm mt-1">
                {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} Ko)
              </p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !eventId || !workoutId}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Soumettre le score"}
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function SubmitScorePage() {
  return (
    <ProtectedRoute>
      <SubmitScoreContent />
    </ProtectedRoute>
  );
}
