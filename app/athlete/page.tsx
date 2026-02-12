"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRegistrationsByUser,
  getEvent,
} from "@/lib/db";
import type { EventWithId } from "@/types";
import type { EventRegistrationWithId } from "@/types";

/**
 * Vue athlète : pour les utilisateurs qui ne sont pas organisateurs (ou qui veulent l’espace athlète).
 * Mes événements, découvrir les événements, soumettre un score, classements.
 */
function AthleteViewContent() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistrationWithId[]>([]);
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getRegistrationsByUser(user.uid)
      .then((result) => {
        setRegistrations(result.registrations);
        return Promise.all(
          result.registrations.map((r) => getEvent(r.eventId))
        );
      })
      .then((evs) => setEvents(evs.filter((e): e is EventWithId => e !== null)))
      .catch((err) => {
        console.error("[Athlete] getRegistrationsByUser failed:", err);
        setRegistrations([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-2">Espace athlète</h1>
      <p className="text-[var(--muted)] mb-8">
        Consulte tes événements, soumets tes scores et suis les classements.
      </p>

      {/* Actions principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Link
          href="/events"
          className="rounded-xl border-2 border-[var(--card-border)] bg-[var(--card)] p-5 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors block"
        >
          <span className="text-2xl font-bold block mb-1">Événements</span>
          <span className="text-[var(--muted)] text-sm">
            Voir tous les événements et s’inscrire
          </span>
        </Link>
        <Link
          href="/scores/submit"
          className="rounded-xl bg-[var(--accent)] text-black p-5 hover:opacity-90 transition-opacity block"
        >
          <span className="text-2xl font-bold block mb-1">Soumettre un score</span>
          <span className="text-black/80 text-sm">
            Enregistrer ton résultat pour un WOD
          </span>
        </Link>
        <Link
          href="/leaderboards"
          className="rounded-xl border-2 border-[var(--card-border)] bg-[var(--card)] p-5 hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors block"
        >
          <span className="text-2xl font-bold block mb-1">Classements</span>
          <span className="text-[var(--muted)] text-sm">
            Consulter les leaderboards par événement
          </span>
        </Link>
      </div>

      {/* Mes événements */}
      <Card>
        <h2 className="text-xl font-bold mb-1">Mes événements</h2>
        <p className="text-[var(--muted)] text-sm mb-4">
          Événements auxquels tu es inscrit.
        </p>
        {loading ? (
          <p className="text-[var(--muted)]">Chargement…</p>
        ) : registrations.length === 0 ? (
          <p className="text-[var(--muted)]">
            Tu n’es inscrit à aucun événement.{" "}
            <Link href="/events" className="text-[var(--accent)] hover:underline">
              Parcourir les événements
            </Link>{" "}
            pour t’inscrire.
          </p>
        ) : (
          <ul className="space-y-3">
            {registrations.map((reg) => {
              const ev = events.find((e) => e.id === reg.eventId);
              const startStr =
                ev?.startDate instanceof Date
                  ? ev.startDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "";
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--card-border)] p-4 bg-[var(--background)]"
                >
                  <div>
                    <span className="font-semibold">
                      {ev?.title ?? "Événement"}
                    </span>
                    {startStr && (
                      <span className="text-[var(--muted)] text-sm ml-2">
                        · {startStr}
                      </span>
                    )}
                    <span className="text-[var(--muted)] text-sm ml-2">
                      · {reg.division}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/events/${reg.eventId}`}
                      className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-black hover:border-[var(--accent)] transition-colors"
                    >
                      Voir l’événement
                    </Link>
                    <Link
                      href={`/scores/submit?eventId=${reg.eventId}`}
                      className="rounded-lg bg-[var(--accent)] text-black px-3 py-2 text-sm font-semibold hover:opacity-90"
                    >
                      Soumettre un score
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Layout>
  );
}

export default function AthletePage() {
  return (
    <ProtectedRoute>
      <AthleteViewContent />
    </ProtectedRoute>
  );
}
