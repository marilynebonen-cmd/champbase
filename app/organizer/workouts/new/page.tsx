"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGymsWhereUserCanCreateWod,
  getEventsByCreator,
  getEvent,
  createWorkout,
  createLeaderboardsForWorkout,
} from "@/lib/db";
import type { ScoreType } from "@/types";

const SCORE_TYPES: { value: ScoreType; label: string }[] = [
  { value: "REPS", label: "REPS" },
  { value: "TIME", label: "TIME" },
  { value: "WEIGHT", label: "WEIGHT" },
];

function getDefaultUnit(scoreType: ScoreType): string {
  if (scoreType === "TIME") return "mm:ss";
  if (scoreType === "WEIGHT") return "lb";
  return "reps";
}

function NewWorkoutContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId") ?? "";
  const gymIdFromUrl = searchParams.get("gymId") ?? "";

  const [gyms, setGyms] = useState<Awaited<ReturnType<typeof getGymsWhereUserCanCreateWod>>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getEventsByCreator>>>([]);
  const [event, setEvent] = useState<Awaited<ReturnType<typeof getEvent>>>(null);
  const [gymId, setGymId] = useState("");
  const [eventId, setEventId] = useState<string | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scoreType, setScoreType] = useState<ScoreType>("REPS");
  const [unit, setUnit] = useState("reps");
  const [scoringNotes, setScoringNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getGymsWhereUserCanCreateWod(user.uid), getEventsByCreator(user.uid)])
      .then(([g, e]) => {
        setGyms(g);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (eventIdFromUrl) {
      setEventId(eventIdFromUrl);
      getEvent(eventIdFromUrl).then((ev) => {
        setEvent(ev ?? null);
        if (ev?.gymId) setGymId(ev.gymId);
      });
    } else if (gymIdFromUrl) {
      setGymId(gymIdFromUrl);
      setEventId("");
    }
  }, [eventIdFromUrl, gymIdFromUrl]);

  useEffect(() => {
    setUnit(getDefaultUnit(scoreType));
  }, [scoreType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gymId.trim()) {
      setError("Select a gym.");
      return;
    }
    setSubmitting(true);
    try {
      const workoutId = await createWorkout({
        gymId: gymId.trim(),
        eventId: eventId && eventId.trim() ? eventId.trim() : null,
        name: name.trim() || "Workout",
        description: description.trim() || undefined,
        scoreType,
        scoringNotes: scoringNotes.trim() || undefined,
        unit: unit.trim() || getDefaultUnit(scoreType),
        deadline: deadline ? new Date(deadline) : null,
      });
      const isPublic = event ? event.status === "published" : true;
      await createLeaderboardsForWorkout(
        gymId.trim(),
        eventId && eventId.trim() ? eventId.trim() : null,
        workoutId,
        isPublic
      );
      if (eventId && eventId.trim()) {
        router.push(`/organizer/events/${eventId}`);
      } else {
        router.push("/organizer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isEventWorkout = !!eventIdFromUrl || !!eventId;
  const backHref = eventId ? `/organizer/events/${eventId}` : gymIdFromUrl ? "/organizer" : "/organizer";

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href={backHref} className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← {eventId ? "Event" : "Organizer"}
      </Link>
      <h1 className="text-3xl font-bold mb-6">
        {gymIdFromUrl && !eventIdFromUrl ? "Add gym WOD" : "Add workout"}
      </h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gym *</label>
            <select
              value={gymId}
              onChange={(e) => setGymId(e.target.value)}
              required
              disabled={!!eventIdFromUrl}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] disabled:opacity-70"
            >
              <option value="">Select gym</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {gyms.length === 0 && (
              <p className="text-[var(--muted)] text-sm mt-1">
                <Link href="/organizer/gyms/new" className="text-[var(--accent)] hover:underline">
                  Create a gym first
                </Link>
              </p>
            )}
          </div>

          {!eventIdFromUrl && (
            <div>
              <label className="block text-sm font-medium mb-1">Event (optional)</label>
              <select
                value={eventId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEventId(id);
                  if (id) {
                    getEvent(id).then(setEvent);
                  } else {
                    setEvent(null);
                  }
                }}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="">Gym WOD (no event)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {eventIdFromUrl && event && (
            <p className="text-[var(--muted)] text-sm">Event: {event.title}</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workout 1"
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Score type *</label>
            <select
              value={scoreType}
              onChange={(e) => setScoreType(e.target.value as ScoreType)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {SCORE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            {scoreType === "WEIGHT" ? (
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            ) : (
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={scoreType === "TIME" ? "mm:ss" : "reps"}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scoring notes (optional)</label>
            <input
              type="text"
              value={scoringNotes}
              onChange={(e) => setScoringNotes(e.target.value)}
              placeholder="e.g. time cap, tie-break"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deadline (optional)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || gyms.length === 0}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create workout"}
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function NewWorkoutPage() {
  return (
    <OrganizerRoute>
      <Suspense fallback={<Layout><p className="text-[var(--muted)]">Loading…</p></Layout>}>
        <NewWorkoutContent />
      </Suspense>
    </OrganizerRoute>
  );
}
