"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { serverTimestamp } from "firebase/firestore";
import { getUser, getWorkout, getWorkoutsByEvent, submitScore, setGymFeedDoc } from "@/lib/db";
import { uploadRootScorePhoto, uploadGymWodScorePhoto } from "@/lib/storage";
import type { EventWithId } from "@/types";
import type { LeaderboardWithId, WorkoutWithId } from "@/types";
import type { SubmissionType } from "@/types";
import { DIVISIONS, type Division } from "@/types";

/**
 * Score submission: athletes (own score, online) or judges (for athlete, live).
 * Event leaderboard: one per event, user selects WOD + category (filters).
 */
export function SubmitScoreForm({
  events,
  leaderboards,
  onSelectEvent,
  onSelectLeaderboard,
}: {
  events: EventWithId[];
  leaderboards: LeaderboardWithId[];
  onSelectEvent: (eventId: string) => void;
  onSelectLeaderboard: (leaderboardId: string | null) => void;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [eventId, setEventId] = useState<string>("");
  const [leaderboardId, setLeaderboardId] = useState<string>("");
  const [workoutId, setWorkoutId] = useState<string>("");
  const [division, setDivision] = useState<Division>("M_RX");
  const [eventWorkouts, setEventWorkouts] = useState<WorkoutWithId[]>([]);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("athlete");
  const [athleteName, setAthleteName] = useState("");
  const [athleteUid, setAthleteUid] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const lb = leaderboards.find((l) => l.id === leaderboardId);
  const isEventLeaderboard = lb?.workoutId == null;
  const isDailyGymWod = !!(lb && !lb.eventId);
  const isJudge = submissionType === "judge";

  useEffect(() => {
    if (!eventId) {
      onSelectEvent("");
      return;
    }
    onSelectEvent(eventId);
  }, [eventId, onSelectEvent]);

  useEffect(() => {
    if (!leaderboardId) {
      onSelectLeaderboard(null);
      return;
    }
    onSelectLeaderboard(leaderboardId);
  }, [leaderboardId, onSelectLeaderboard]);

  useEffect(() => {
    if (!lb?.eventId || lb.workoutId != null) {
      setEventWorkouts([]);
      setWorkoutId("");
      return;
    }
    getWorkoutsByEvent(lb.eventId).then(setEventWorkouts);
  }, [lb?.eventId, lb?.workoutId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    if (!lb) {
      setError("Select a leaderboard.");
      return;
    }
    const effectiveWorkoutId = isEventLeaderboard ? workoutId : lb.workoutId;
    const effectiveDivision = isEventLeaderboard ? division : lb.division;
    if (!effectiveWorkoutId || effectiveDivision == null) {
      setError(isEventLeaderboard ? "Select WOD and category." : "Select a leaderboard.");
      return;
    }
    const name = isJudge ? athleteName : (await getUser(user.uid))?.displayName ?? user.email ?? "";
    const uid = isJudge ? athleteUid : user.uid;
    if (!name && !isJudge) {
      setError("Set your display name in Profile.");
      return;
    }
    if (isJudge && !athleteName.trim()) {
      setError("Enter athlete name for judge submission.");
      return;
    }
    try {
      const workout = await getWorkout(effectiveWorkoutId);
      const scoreType = workout?.scoreType ?? "REPS";
      const isEventScore = !!(lb?.eventId);
      // gymId from workout first (no dependency on lb.gymId)
      const gymIdForPayload = (workout?.gymId ?? lb?.gymId ?? "") as string;
      let photoUrl: string | undefined;
      if (photoFile && gymIdForPayload) {
        if (isEventScore) {
          const { downloadUrl } = await uploadRootScorePhoto(gymIdForPayload, uid, photoFile);
          photoUrl = downloadUrl;
        } else {
          const { downloadUrl } = await uploadGymWodScorePhoto(
            gymIdForPayload,
            effectiveWorkoutId,
            uid,
            photoFile
          );
          photoUrl = downloadUrl;
        }
      }
      const scoreInput = {
        gymId: gymIdForPayload,
        isEventScore,
        eventId: (lb?.eventId ?? null) as string | null,
        leaderboardId: lb.id,
        workoutId: effectiveWorkoutId,
        athleteUid: uid,
        athleteName: name || athleteName.trim(),
        division: effectiveDivision,
        scoreType,
        scoreValue: scoreValue.trim(),
        submittedByUid: user.uid,
        submissionType,
        comment: comment.trim() || undefined,
        photoUrl,
      };
      if (!isEventScore) {
        console.log("[GYM SCORE SUBMIT]", scoreInput);
      }
      const scoreId = await submitScore(scoreInput);
      const gymId = scoreInput.gymId;
      if (!isEventScore && gymId) {
        console.log("[GYM FEED WRITE]", { gymId, scoreId });
        await setGymFeedDoc(gymId, scoreId, {
          gymId,
          scoreId,
          workoutId: scoreInput.workoutId,
          athleteUid: uid,
          athleteName: name || athleteName.trim(),
          division: scoreInput.division,
          scoreType: scoreInput.scoreType,
          scoreValue: scoreInput.scoreValue,
          comment: comment.trim() || null,
          photoUrl: photoUrl ?? null,
          workoutName: workout?.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setSuccess(true);
      setScoreValue("");
      setComment("");
      setPhotoFile(null);
      addToast("Score submitted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      setError(msg);
      addToast(msg, "error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Event</label>
        <select
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setLeaderboardId("");
          }}
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
      <div>
        <label className="block text-sm font-medium mb-1">Classement</label>
        <select
          value={leaderboardId}
          onChange={(e) => {
            setLeaderboardId(e.target.value);
            setWorkoutId("");
            onSelectLeaderboard(e.target.value || null);
          }}
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="">Sélectionner un classement</option>
          {leaderboards.map((l) => (
            <option key={l.id} value={l.id}>
              {l.workoutId == null ? "Classement de l'événement" : (l.division ?? l.id)}
            </option>
          ))}
        </select>
      </div>
      {isEventLeaderboard && eventWorkouts.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">WOD</label>
            <select
              value={workoutId}
              onChange={(e) => setWorkoutId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Sélectionner un WOD</option>
              {eventWorkouts.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value as Division)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Submit as</label>
        <select
          value={submissionType}
          onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="athlete">Athlete (own score)</option>
          <option value="judge">Judge (on behalf of athlete)</option>
        </select>
      </div>
      {isJudge && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Athlete name</label>
            <input
              type="text"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              placeholder="Athlete display name"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Athlete UID (optional)</label>
            <input
              type="text"
              value={athleteUid}
              onChange={(e) => setAthleteUid(e.target.value)}
              placeholder="Leave empty if unknown"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Score</label>
        <input
          type="text"
          value={scoreValue}
          onChange={(e) => setScoreValue(e.target.value)}
          placeholder="e.g. 5:30 or 100 reps"
          required
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
      </div>
      {isDailyGymWod && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Caption (optional)</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a caption for the feed"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Photo (optional)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
        </>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">Score submitted.</p>}
      <button
        type="submit"
        className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
      >
        Submit score
      </button>
    </form>
  );
}
