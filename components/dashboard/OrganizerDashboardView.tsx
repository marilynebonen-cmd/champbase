"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getGymsWhereUserCanCreateWod,
  getEventsByCreator,
  getAllWodsByGym,
  deleteGym,
  deleteEvent,
  deleteWod,
} from "@/lib/db";
import type { GymWithId, EventWithId, WodWithId } from "@/types";

/**
 * Organizer dashboard view: Mes gyms (list, create, WODs par gym), Mes événements (list, create, delete).
 * Rendered inside Layout by the page. No auth/role wrapper here.
 */
export function OrganizerDashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingGymId, setDeletingGymId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingWodKey, setDeletingWodKey] = useState<string | null>(null);
  const [wodsByGym, setWodsByGym] = useState<Record<string, WodWithId[]>>({});

  const loadData = () => {
    if (!user) return;
    setFetchError(null);
    Promise.all([
      getGymsWhereUserCanCreateWod(user.uid),
      getEventsByCreator(user.uid),
    ])
      .then(([gymList, eventList]) => {
        setGyms(gymList);
        setEvents(eventList);
        setFetchError(null);
        return gymList;
      })
      .then((gymList) => {
        if (!gymList?.length) {
          setWodsByGym({});
          return;
        }
        const list = gymList;
        return Promise.all(list.map((g) => getAllWodsByGym(g.id, 50)))
          .then((wodArrays) => {
            const map: Record<string, WodWithId[]> = {};
            list.forEach((g, i) => {
              map[g.id] = wodArrays[i] ?? [];
            });
            setWodsByGym(map);
          })
          .catch(() => setWodsByGym({}));
      })
      .catch((err) => {
        console.error("[Organizer] load failed:", err);
        setGyms([]);
        setEvents([]);
        setWodsByGym({});
        setFetchError(err instanceof Error ? err.message : "Impossible de charger les données");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadData();
  }, [user]);

  const gymById = Object.fromEntries(gyms.map((g) => [g.id, g]));

  async function handleDeleteGym(g: GymWithId, force = false) {
    if (!user || deletingGymId) return;
    const ok = window.confirm(
      force
        ? `Ce gym a des événements ou des WODs. Supprimer quand même le gym « ${g.name} » ?`
        : `Supprimer le gym « ${g.name} » ? Cette action est irréversible.`
    );
    if (!ok) return;
    setDeletingGymId(g.id);
    try {
      await deleteGym(g.id, force);
      addToast("Gym supprimé.");
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
      const isBlocked = msg.includes("événements") || msg.includes("WODs");
      addToast(msg, "error");
      if (isBlocked && !force) {
        const forceOk = window.confirm(
          "Supprimer quand même le gym ? (Les événements et WODs resteront.)"
        );
        if (forceOk) await handleDeleteGym(g, true);
      }
    } finally {
      setDeletingGymId(null);
    }
  }

  async function handleDeleteWod(gymId: string, wod: WodWithId) {
    const key = `${gymId}_${wod.id}`;
    if (!user || deletingWodKey) return;
    const ok = window.confirm(
      `Supprimer le WOD « ${wod.title} » ? Les scores enregistrés seront aussi supprimés. Cette action est irréversible.`
    );
    if (!ok) return;
    setDeletingWodKey(key);
    try {
      await deleteWod(gymId, wod.id);
      addToast("WOD supprimé.");
      loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de la suppression", "error");
    } finally {
      setDeletingWodKey(null);
    }
  }

  async function handleDeleteEvent(ev: EventWithId) {
    if (!user || deletingEventId) return;
    const ok = window.confirm(
      `Supprimer l'événement « ${ev.title} » ? Les WODs et leaderboards liés ne sont pas supprimés.`
    );
    if (!ok) return;
    setDeletingEventId(ev.id);
    try {
      await deleteEvent(ev.id);
      addToast("Événement supprimé.");
      loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de la suppression", "error");
    } finally {
      setDeletingEventId(null);
    }
  }

  function eventDateStr(ev: EventWithId): string {
    const start =
      ev.startDate instanceof Date
        ? ev.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : "";
    const end =
      ev.endDate instanceof Date
        ? ev.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : "";
    return end && end !== start ? `${start} – ${end}` : start;
  }

  if (loading) {
    return <p className="text-[var(--muted)]">Chargement…</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Organizer</h1>

      {fetchError && (
        <Card className="mb-6 border-red-500/50 bg-red-500/10">
          <p className="text-red-400 font-medium">Erreur</p>
          <p className="text-sm text-[var(--muted)] mt-1">{fetchError}</p>
        </Card>
      )}

      {/* ─── Mes gyms ───────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold">Mes gyms</h2>
          <div className="flex items-center gap-2">
            {gyms.length > 0 && (
              <Link
                href="/organizer/gyms"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Voir tous
              </Link>
            )}
            <Link
              href="/organizer/gyms/new"
              className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Créer un gym
            </Link>
          </div>
        </div>

        {gyms.length === 0 && !fetchError ? (
          <Card className="mb-4">
            <p className="text-[var(--muted)] mb-3">
              Vous n&apos;avez pas encore de gym. Créez-en un pour organiser des événements et des WODs.
            </p>
            <Link
              href="/organizer/gyms/new"
              className="text-[var(--accent)] font-medium hover:underline"
            >
              Créer un gym →
            </Link>
          </Card>
        ) : (
          <ul className="space-y-4">
            {gyms.map((g) => {
              const wods = wodsByGym[g.id] ?? [];
              return (
                <li key={g.id}>
                  <Card className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">{g.name}</span>
                        {(g.city || g.country) && (
                          <span className="text-[var(--muted)] text-sm ml-2">
                            {[g.city, g.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/organizer/wods/new?gymId=${g.id}`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          Créer un WOD (gym)
                        </Link>
                        {g.ownerUid === user?.uid && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGym(g)}
                            disabled={deletingGymId === g.id}
                            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                            title="Supprimer le gym"
                          >
                            {deletingGymId === g.id ? "Suppression…" : "Supprimer"}
                          </button>
                        )}
                      </div>
                    </div>
                    {wods.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
                        <ul className="space-y-2">
                          {wods.map((wod) => {
                            const deletingKey = `${g.id}_${wod.id}`;
                            const isDeleting = deletingWodKey === deletingKey;
                            return (
                              <li
                                key={wod.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg py-1.5 px-2 -mx-2 hover:bg-[var(--background)]/50"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/athlete/wods/${wod.id}?gymId=${g.id}`}
                                    className="text-sm text-[var(--accent)] hover:underline"
                                  >
                                    {wod.title} — classement
                                  </Link>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/organizer/wods/${wod.id}/edit?gymId=${g.id}`}
                                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
                                  >
                                    Modifier
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWod(g.id, wod)}
                                    disabled={isDeleting}
                                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                                    title="Supprimer le WOD"
                                  >
                                    {isDeleting ? "Suppression…" : "Supprimer"}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Mes événements ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold">Mes événements</h2>
          <Link
            href="/organizer/events/new"
            className="inline-block rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--card)]"
          >
            Créer un événement
          </Link>
        </div>

        {events.length === 0 ? (
          <Card className="mb-4">
            <p className="text-[var(--muted)] mb-3">
              Aucun événement. Créez-en un depuis un gym (ci-dessus) ou en cliquant sur « Créer un événement ».
            </p>
            <Link
              href="/organizer/events/new"
              className="text-[var(--accent)] font-medium hover:underline"
            >
              Créer un événement →
            </Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/organizer/events/${ev.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/organizer/events/${ev.id}`)}
                  className="cursor-pointer"
                >
                <Card className="flex flex-wrap items-center justify-between gap-2 hover:border-[var(--accent)] transition-colors">
                  <div>
                    <span className="font-semibold text-[var(--foreground)]">
                      {ev.title}
                    </span>
                    <p className="text-[var(--muted)] text-sm mt-0.5">
                      {gymById[ev.gymId]?.name ?? ev.gymId} · {eventDateStr(ev)}
                      {ev.status !== "published" && (
                        <span className="ml-1">· {ev.status}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/organizer/events/${ev.id}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Voir l&apos;événement →
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(ev);
                      }}
                      disabled={deletingEventId === ev.id}
                      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Supprimer l'événement"
                    >
                      {deletingEventId === ev.id ? "Suppression…" : "Supprimer"}
                    </button>
                  </div>
                </Card>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[var(--muted)] text-sm mt-1">
          Chaque événement a sa page : vous y ajoutez des WODs (workouts) avec leaderboards par division.
        </p>
        {events.length > 0 && (
          <p className="text-sm mt-2">
            <Link href="/organizer/seed-workouts" className="text-[var(--accent)] hover:underline">
              Créer des WODs de test pour un événement
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
