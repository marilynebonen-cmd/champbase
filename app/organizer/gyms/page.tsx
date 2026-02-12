"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getGymsByOwner, deleteGym } from "@/lib/db";
import type { GymWithId } from "@/types";

/**
 * List all gyms created by the organizer. Each gym can be used to create an event.
 */
function GymsListContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGyms = () => {
    if (!user) return;
    setFetchError(null);
    getGymsByOwner(user.uid)
      .then((list) => {
        setGyms(list);
        setFetchError(null);
      })
      .catch((err) => {
        console.error("[Mes gyms] getGymsByOwner failed:", err);
        setGyms([]);
        setFetchError(err instanceof Error ? err.message : "Impossible de charger les gyms");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadGyms();
  }, [user]);

  async function handleDelete(g: GymWithId, force = false) {
    if (!user || deletingId) return;
    const ok = window.confirm(
      force
        ? `Ce gym a des événements ou des WODs. Supprimer quand même le gym « ${g.name} » de la base de données ?`
        : `Supprimer le gym « ${g.name} » ? Cette action est irréversible.`
    );
    if (!ok) return;
    setDeletingId(g.id);
    try {
      await deleteGym(g.id, force);
      addToast("Gym supprimé de la base de données.");
      loadGyms();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
      const isBlocked = msg.includes("événements") || msg.includes("WODs");
      addToast(msg, "error");
      if (isBlocked && !force) {
        const forceOk = window.confirm(
          "Supprimer quand même le gym de la base de données ? (Les événements et WODs resteront.)"
        );
        if (forceOk) await handleDelete(g, true);
      }
    } finally {
      setDeletingId(null);
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
      <h1 className="text-3xl font-bold mb-2">Mes gyms</h1>
      <p className="text-[var(--muted)] mb-6">
        Gyms que vous avez créés. Sélectionnez un gym pour créer un événement ou ajouter un WOD.
      </p>

      {fetchError && (
        <Card className="mb-6 border-red-500/50 bg-red-500/10">
          <p className="text-red-400 font-medium">Erreur lors du chargement des gyms</p>
          <p className="text-sm text-[var(--muted)] mt-1">{fetchError}</p>
          <p className="text-xs text-[var(--muted)] mt-2">Vérifiez la console du navigateur (F12) pour plus de détails.</p>
        </Card>
      )}

      {gyms.length === 0 && !fetchError ? (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-2">Aucun gym</h2>
          <p className="text-[var(--muted)] mb-4">
            Créez un gym pour pouvoir organiser des événements et des WODs.
          </p>
          <Link
            href="/organizer/gyms/new"
            className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
          >
            Créer un gym
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {gyms.map((g) => (
            <li key={g.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-lg">{g.name}</span>
                  {(g.city || g.country) && (
                    <p className="text-[var(--muted)] text-sm mt-0.5">
                      {[g.city, g.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/organizer/gyms/${g.id}/edit`}
                    className="inline-block rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
                  >
                    Modifier infos & photos
                  </Link>
                  <Link
                    href={`/organizer/events/new?gymId=${g.id}`}
                    className="inline-block rounded-lg bg-[var(--accent)] text-black px-3 py-2 text-sm font-semibold hover:opacity-90"
                  >
                    Créer un événement
                  </Link>
                  <Link
                    href={`/organizer/workouts/new?gymId=${g.id}`}
                    className="inline-block rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
                  >
                    Ajouter un WOD
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(g)}
                    disabled={deletingId === g.id}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                    title="Supprimer le gym"
                  >
                    {deletingId === g.id ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link
          href="/organizer/gyms/new"
          className="text-[var(--accent)] hover:underline text-sm"
        >
          + Créer un nouveau gym
        </Link>
      </div>
    </Layout>
  );
}

export default function OrganizerGymsPage() {
  return (
    <OrganizerRoute>
      <GymsListContent />
    </OrganizerRoute>
  );
}
