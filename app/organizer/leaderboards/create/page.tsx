"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getEventsByCreator, getWorkoutsByEvent, getWorkout, createLeaderboard } from "@/lib/db";
import { DIVISIONS, type Division } from "@/types";

function CreateLeaderboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getEventsByCreator>>>([]);
  const [workouts, setWorkouts] = useState<Awaited<ReturnType<typeof getWorkoutsByEvent>>>([]);
  const [eventId, setEventId] = useState("");
  const [workoutId, setWorkoutId] = useState("");
  const [division, setDivision] = useState<Division>("M_RX");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getEventsByCreator(user.uid).then(setEvents);
  }, [user]);

  useEffect(() => {
    if (!eventId) {
      setWorkouts([]);
      setWorkoutId("");
      return;
    }
    getWorkoutsByEvent(eventId).then(setWorkouts);
  }, [eventId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!workoutId) {
      setError("Select a workout.");
      return;
    }
    try {
      const workout = await getWorkout(workoutId);
      if (!workout) {
        setError("Workout not found.");
        return;
      }
      await createLeaderboard({
        gymId: workout.gymId,
        eventId: workout.eventId,
        workoutId,
        division,
        isPublic,
      });
      router.push(eventId ? `/organizer/events/${eventId}` : "/organizer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block">
        ← Organizer
      </Link>
      <h1 className="text-3xl font-bold mb-6">Create leaderboard</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Event</label>
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setWorkoutId("");
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
            <label className="block text-sm font-medium mb-1">Workout</label>
            <select
              value={workoutId}
              onChange={(e) => setWorkoutId(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Select workout</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Division</label>
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="isPublic">Public leaderboard</label>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
          >
            Create leaderboard
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function CreateLeaderboardPage() {
  return (
    <OrganizerRoute>
      <CreateLeaderboardContent />
    </OrganizerRoute>
  );
}
