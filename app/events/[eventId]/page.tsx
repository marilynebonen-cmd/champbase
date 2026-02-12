"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEvent,
  getGym,
  getWorkoutsByEvent,
  getLeaderboardsByEvent,
  getRegistration,
  createRegistration,
  onScoresByLeaderboard,
  getUsersByIds,
} from "@/lib/db";
import { buildEventLeaderboard } from "@/lib/eventLeaderboardUtils";
import { EventLeaderboardTable } from "@/components/EventLeaderboardTable";
import type { EventWithId, WorkoutWithId, LeaderboardWithId, GymWithId, UserProfile } from "@/types";
import type { ScoreWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

type TabId = "wods" | "participants" | "leaderboard";

/**
 * Page événement : si organisateur → redirection vers /organizer/events/[id].
 * Sinon → vue lecture seule avec la même structure que la page organisateur
 * (bannière, onglets WODs | Participants | Classement), sans boutons d’édition.
 */
export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [gym, setGym] = useState<GymWithId | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutWithId[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardWithId[]>([]);
  const [registration, setRegistration] = useState<Awaited<ReturnType<typeof getRegistration>>>(null);
  const [inscriptionDivision, setInscriptionDivision] = useState<Division>("M_RX");
  const [inscribing, setInscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("wods");
  const [eventScores, setEventScores] = useState<ScoreWithId[]>([]);
  const [leaderboardDivision, setLeaderboardDivision] = useState<Division>("M_RX");
  const [eventAthletesMap, setEventAthletesMap] = useState<Map<string, UserProfile>>(new Map());

  const eventLeaderboardTable = useMemo(
    () =>
      workouts.length > 0
        ? buildEventLeaderboard(workouts, eventScores, leaderboardDivision)
        : null,
    [workouts, eventScores, leaderboardDivision]
  );

  useEffect(() => {
    if (!eventLeaderboardTable?.rows.length) {
      setEventAthletesMap(new Map());
      return;
    }
    const uids = [...new Set(eventLeaderboardTable.rows.map((r) => r.athleteUid))];
    getUsersByIds(uids).then(setEventAthletesMap);
  }, [eventLeaderboardTable]);

  useEffect(() => {
    if (!eventId) return;
    setLoadError(null);
    getEvent(eventId)
      .then((ev) => {
        if (!ev) {
          setEvent(null);
          return;
        }
        setEvent(ev);
        if (ev.gymId) {
          getGym(ev.gymId).then((g) => setGym(g ?? null));
        } else {
          setGym(null);
        }
        return Promise.all([
          getWorkoutsByEvent(eventId).catch(() => [] as WorkoutWithId[]),
          getLeaderboardsByEvent(eventId).catch(() => [] as LeaderboardWithId[]),
        ]);
      })
      .then((result) => {
        if (result) {
          const [w, lb] = result;
          setWorkouts(w);
          setLeaderboards(lb);
        }
      })
      .catch((err) => {
        console.error("[Event page] load failed:", err);
        setLoadError(err instanceof Error ? err.message : "Erreur de chargement");
        setEvent(null);
        setWorkouts([]);
        setLeaderboards([]);
      })
      .finally(() => setLoading(false));
  }, [eventId, user?.uid]);

  useEffect(() => {
    if (!event || !user || loading) return;
    if (event.createdByUid === user.uid) {
      router.replace(`/organizer/events/${eventId}`);
    }
  }, [event, user, eventId, loading, router]);

  useEffect(() => {
    if (!user || !eventId) return;
    getRegistration(user.uid, eventId).then(setRegistration);
  }, [user, eventId]);

  const eventLeaderboard = leaderboards.find((lb) => lb.workoutId == null);
  useEffect(() => {
    if (!eventLeaderboard?.id) return;
    const unsub = onScoresByLeaderboard(eventLeaderboard.id, setEventScores);
    return () => unsub();
  }, [eventLeaderboard?.id]);

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }
  if (!event) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">
          {loadError ? "Impossible de charger l’événement." : "Événement introuvable."}
        </p>
        {user && (
          <p className="text-[var(--muted)] mt-2 text-sm">
            Vous pouvez essayer la{" "}
            <Link href={`/organizer/events/${eventId}`} className="text-[var(--accent)] hover:underline">
              vue organisateur
            </Link>{" "}
            si vous gérez cet événement.
          </p>
        )}
        <Link href="/events" className="text-[var(--accent)] mt-4 inline-block">
          ← Retour aux événements
        </Link>
      </Layout>
    );
  }

  if (user && event.createdByUid === user.uid) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Redirection vers la gestion de l’événement…</p>
      </Layout>
    );
  }

  const startStr =
    event.startDate instanceof Date
      ? event.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
  const endStr =
    event.endDate instanceof Date
      ? event.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";

  const tabs: { id: TabId; label: string }[] = [
    { id: "wods", label: "WODs" },
    { id: "participants", label: "Participants" },
    { id: "leaderboard", label: "Classement" },
  ];

  return (
    <Layout>
      <Link href="/events" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Événements
      </Link>

      {/* Bannière (identique à la page organisateur) */}
      <div className="relative w-full rounded-xl overflow-hidden mb-6" style={{ maxWidth: "100%" }}>
        <div className="relative aspect-[21/9] min-h-[200px] w-full bg-[var(--card)]">
          {event.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-end p-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                  {event.title}
                </h1>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-end bg-gradient-to-br from-[var(--accent)]/90 to-amber-600/90 p-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                {event.title}
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Dates + type + lieu + description (identique) */}
      <p className="text-[var(--muted)] mb-1">
        {event.type === "live" ? "En présentiel" : "En ligne"} · {startStr}
        {endStr && ` – ${endStr}`}
      </p>
      {gym && (
        <p className="text-[var(--muted)] mb-4">
          Lieu : <span className="text-[var(--foreground)] font-medium">{gym.name}</span>
          {gym.city || gym.country ? ` · ${[gym.city, gym.country].filter(Boolean).join(", ")}` : null}
        </p>
      )}
      {event.description && (
        <div className="mb-6 max-w-3xl">
          <p className="text-[var(--foreground)] whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Bloc inscription (lecteur uniquement) */}
      {user && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-3">Inscription</h2>
          {registration ? (
            <p className="text-[var(--muted)]">
              Tu es inscrit à cet événement (division {registration.division}).{" "}
              <Link href="/dashboard" className="text-[var(--accent)] hover:underline">
                Voir mon dashboard
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="event-division" className="block text-sm font-medium mb-1">
                  Division
                </label>
                <select
                  id="event-division"
                  value={inscriptionDivision}
                  onChange={(e) => setInscriptionDivision(e.target.value as Division)}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={inscribing}
                onClick={async () => {
                  if (!user) return;
                  setInscribing(true);
                  try {
                    await createRegistration({
                      userId: user.uid,
                      eventId,
                      division: inscriptionDivision,
                    });
                    const reg = await getRegistration(user.uid, eventId);
                    setRegistration(reg);
                  } finally {
                    setInscribing(false);
                  }
                }}
                className="w-full sm:w-auto rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {inscribing ? "Inscription…" : "S'inscrire à cet événement"}
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Onglets (même ordre que la page organisateur) */}
      <div className="border-b border-[var(--card-border)] mb-6">
        <nav className="flex gap-1" aria-label="Onglets">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "px-4 py-3 text-sm font-semibold border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "px-4 py-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet WODs (lecture seule : pas de bouton Créer / Supprimer) */}
      {activeTab === "wods" && (
        <section>
          <h2 className="text-xl font-bold mb-4">WODs</h2>
          {workouts.length === 0 ? (
            <Card>
              <p className="text-[var(--muted)]">Aucun WOD pour cet événement.</p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {workouts.map((w) => {
                const eventLeaderboard = leaderboards.find((lb) => lb.workoutId == null);
                const workoutLeaderboards = leaderboards.filter((lb) => lb.workoutId === w.id);
                const lbToLink = eventLeaderboard ?? workoutLeaderboards[0];
                return (
                  <li key={w.id}>
                    <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold">{w.name}</span>
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)] ml-2">
                          {w.scoreType} ({w.unit})
                        </span>
                        {w.deadline && (
                          <span className="text-[var(--muted)] text-sm ml-2">
                            Limite :{" "}
                            {w.deadline instanceof Date
                              ? w.deadline.toLocaleDateString("fr-FR")
                              : ""}
                          </span>
                        )}
                      </div>
                      {lbToLink && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/leaderboards/${lbToLink.id}?workoutId=${w.id}`}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            Voir le classement
                          </Link>
                          <Link
                            href={`/scores/submit?eventId=${eventId}`}
                            className="rounded-lg bg-[var(--accent)] text-black px-3 py-2 text-sm font-semibold hover:opacity-90"
                          >
                            Soumettre un score
                          </Link>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Onglet Participants (lecture seule : pas de liste, réservée à l’organisateur) */}
      {activeTab === "participants" && (
        <section>
          <h2 className="text-xl font-bold mb-4">Participants</h2>
          <Card>
            <p className="text-[var(--muted)]">
              La liste des participants est réservée à l’organisateur de l’événement.
              {user && !registration && (
                <> Tu peux t’inscrire via le bloc « Inscription » au-dessus.</>
              )}
            </p>
          </Card>
        </section>
      )}

      {/* Onglet Classement (même liste de liens que l’organisateur) */}
      {activeTab === "leaderboard" && (
        <section>
          <h2 className="text-xl font-bold mb-4">Classement</h2>
          {!eventLeaderboard ? (
            <Card>
              <p className="text-[var(--muted)]">Aucun classement pour le moment.</p>
            </Card>
          ) : workouts.length === 0 ? (
            <Card>
              <p className="text-[var(--muted)]">Ajoutez des WODs à l&apos;événement pour afficher le classement.</p>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label htmlFor="leaderboard-division" className="text-sm font-medium text-[var(--muted)]">
                  Division
                </label>
                <select
                  id="leaderboard-division"
                  value={leaderboardDivision}
                  onChange={(e) => setLeaderboardDivision(e.target.value as Division)}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <Card className="p-0 overflow-hidden">
                {eventLeaderboardTable && (
                  <EventLeaderboardTable
                    table={eventLeaderboardTable}
                    athletesMap={eventAthletesMap}
                    className="p-2"
                  />
                )}
              </Card>
            </>
          )}
        </section>
      )}
    </Layout>
  );
}
