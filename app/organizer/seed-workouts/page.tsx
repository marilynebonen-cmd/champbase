"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getEventsByCreator,
  getEvent,
  createWorkout,
  createLeaderboardsForWorkout,
} from "@/lib/db";
import type { EventWithId } from "@/types";
import type { ScoreType } from "@/types";

const FAKE_WODS: { name: string; description: string; scoreType: ScoreType; unit: string }[] = [
  { name: "Fran", description: "21-15-9 Thrusters (43/29 kg) et Pull-ups. Temps le plus bas gagne.", scoreType: "TIME", unit: "mm:ss" },
  { name: "Cindy", description: "AMRAP 20 min : 5 pull-ups, 10 push-ups, 15 air squats. Nombre de tours + reps.", scoreType: "REPS", unit: "reps" },
  { name: "Max Snatch", description: "Poids max en Snatch (kg). Un essai par athlète.", scoreType: "WEIGHT", unit: "kg" },
];

/**
 * Page de seed : crée des WODs fictifs pour le premier événement de l'organisateur (pour tests).
 */
function SeedWorkoutsContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seededEventId, setSeededEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getEventsByCreator(user.uid)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSeed(eventId: string) {
    if (!user || seeding) return;
    let ev: EventWithId | null = null;
    try {
      ev = await getEvent(eventId);
    } catch (e) {
      console.error("[Seed WODs] getEvent failed:", e);
      addToast("Impossible de charger l'événement.", "error");
      return;
    }
    if (!ev) {
      addToast("Événement introuvable.", "error");
      return;
    }
    if (!ev.gymId || !ev.gymId.trim()) {
      addToast("Cet événement n'a pas de gym associé. Éditez l'événement et sélectionnez un gym.", "error");
      return;
    }
    setSeeding(true);
    try {
      for (const wod of FAKE_WODS) {
        const workoutId = await createWorkout({
          gymId: ev!.gymId.trim(),
          eventId: ev!.id,
          name: wod.name,
          description: wod.description,
          scoreType: wod.scoreType,
          unit: wod.unit,
          deadline: null,
        });
        await createLeaderboardsForWorkout(
          ev!.gymId.trim(),
          ev!.id,
          workoutId,
          ev!.status === "published"
        );
      }
      setSeededEventId(ev.id);
      addToast(`${FAKE_WODS.length} WODs de test créés.`);
    } catch (err) {
      console.error("[Seed WODs] Error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Erreur lors de la création";
      addToast(msg, "error");
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Organizer
      </Link>
      <h1 className="text-3xl font-bold mb-2">WODs de test</h1>
      <p className="text-[var(--muted)] mb-6">
        Crée des workouts fictifs (Fran, Cindy, Max Snatch) pour un de tes événements afin de tester les leaderboards et la soumission de scores.
      </p>

      {events.length === 0 ? (
        <Card>
          <p className="text-[var(--muted)] mb-3">Tu n'as pas encore d'événement.</p>
          <Link href="/organizer/events/new" className="text-[var(--accent)] font-medium hover:underline">
            Créer un événement →
          </Link>
        </Card>
      ) : seededEventId ? (
        <Card>
          <p className="text-green-400 font-medium mb-3">WODs créés avec succès.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/organizer/events/${seededEventId}`}
              className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
            >
              Voir l&apos;événement et les WODs
            </Link>
            <button
              type="button"
              onClick={() => setSeededEventId(null)}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Créer pour un autre événement
            </button>
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold">{ev.title}</span>
                  <span className="text-[var(--muted)] text-sm ml-2">
                    {ev.status} · {ev.startDate instanceof Date ? ev.startDate.toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={seeding}
                  onClick={() => handleSeed(ev.id)}
                  className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {seeding ? "Création…" : "Créer 3 WODs de test"}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[var(--muted)] text-sm mt-4">
        WODs créés : Fran (temps), Cindy (reps), Max Snatch (poids). Un seul classement pour l&apos;événement ; les catégories (M_RX, M_SCALED, F_RX, F_SCALED) sont des filtres sur la page classement.
      </p>
    </Layout>
  );
}

export default function SeedWorkoutsPage() {
  return (
    <OrganizerRoute>
      <SeedWorkoutsContent />
    </OrganizerRoute>
  );
}
