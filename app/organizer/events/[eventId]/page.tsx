"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import {
  getEvent,
  getGym,
  getWorkoutsByEvent,
  getLeaderboardsByEvent,
  getRegistrationsByEvent,
  deleteWorkout,
  createRegistration,
  updateEvent,
} from "@/lib/db";
import { uploadEventBanner } from "@/lib/storage";
import { resizeImageToBanner } from "@/lib/bannerImage";
import { ImageCropModal } from "@/components/ImageCropModal";
import { useToast } from "@/contexts/ToastContext";
import type { EventWithId, WorkoutWithId, LeaderboardWithId, GymWithId } from "@/types";
import type { EventRegistrationWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

type TabId = "wods" | "participants" | "leaderboard";

/**
 * Page événement organisateur: bannière, description, onglets WODs | Participants | Leaderboard.
 */
function OrganizerEventContent() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { addToast } = useToast();
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [gym, setGym] = useState<GymWithId | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutWithId[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardWithId[]>([]);
  const [participants, setParticipants] = useState<EventRegistrationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("wods");
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [addParticipantEmail, setAddParticipantEmail] = useState("");
  const [addParticipantName, setAddParticipantName] = useState("");
  const [addParticipantDivision, setAddParticipantDivision] = useState<Division>("M_RX");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleDeleteWorkout(w: WorkoutWithId) {
    if (!confirm(`Supprimer le WOD « ${w.name} » ? Les scores déjà saisis pour ce WOD restent dans le classement.`)) return;
    setDeletingWorkoutId(w.id);
    try {
      await deleteWorkout(w.id);
      setWorkouts((prev) => prev.filter((x) => x.id !== w.id));
      addToast("WOD supprimé.");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de la suppression", "error");
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    const email = addParticipantEmail.trim().toLowerCase();
    if (!email) {
      addToast("Indiquez l'email du participant.", "error");
      return;
    }
    setAddingParticipant(true);
    try {
      await createRegistration({
        userId: "",
        eventId,
        division: addParticipantDivision,
        email,
        displayName: addParticipantName.trim() || undefined,
      });
      const list = await getRegistrationsByEvent(eventId);
      setParticipants(list);
      setAddParticipantEmail("");
      setAddParticipantName("");
      addToast("Participant ajouté. Un compte athlète sera créé lorsqu'il s'inscrira avec cet email.");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de l'ajout", "error");
    } finally {
      setAddingParticipant(false);
    }
  }

  function handleBannerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !eventId || !event) return;
    if (!file.type.startsWith("image/")) {
      addToast("Choisissez une image (JPEG, PNG ou WebP).", "error");
      return;
    }
    setBannerCropSrc(URL.createObjectURL(file));
  }

  async function handleBannerCropConfirm(croppedFile: File) {
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
    setBannerCropSrc(null);
    if (!eventId || !event) return;
    setBannerUploading(true);
    try {
      let fileToUpload: File;
      try {
        fileToUpload = await resizeImageToBanner(croppedFile);
      } catch {
        fileToUpload = croppedFile;
      }
      const { downloadUrl } = await uploadEventBanner(eventId, fileToUpload);
      await updateEvent(eventId, { imageUrl: downloadUrl });
      const updated = await getEvent(eventId);
      if (updated) setEvent(updated);
      addToast("Bannière enregistrée.");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de l'envoi.", "error");
    } finally {
      setBannerUploading(false);
    }
  }

  function handleBannerCropCancel() {
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
    setBannerCropSrc(null);
  }

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then((ev) => {
        if (!ev) {
          setEvent(null);
          setError(null);
          return;
        }
        setEvent(ev);
        setError(null);
        if (ev.gymId) {
          getGym(ev.gymId).then((g) => setGym(g ?? null));
        } else {
          setGym(null);
        }
        // Charger WODs, leaderboards et participants en parallèle ; en cas d'échec on affiche quand même l'événement
        Promise.all([
          getWorkoutsByEvent(eventId).catch((err) => {
            console.error("[Event page] getWorkoutsByEvent failed:", err);
            return [] as WorkoutWithId[];
          }),
          getLeaderboardsByEvent(eventId).catch((err) => {
            console.error("[Event page] getLeaderboardsByEvent failed:", err);
            return [] as LeaderboardWithId[];
          }),
          getRegistrationsByEvent(eventId).catch((err) => {
            console.error("[Event page] getRegistrationsByEvent failed:", err);
            return [] as EventRegistrationWithId[];
          }),
        ]).then(([w, lb, regs]) => {
          setWorkouts(w);
          setLeaderboards(lb);
          setParticipants(regs);
        });
      })
      .catch(() => setError("Impossible de charger l'événement"))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }
  if (error || !event) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">{error ?? "Événement introuvable."}</p>
        <Link href="/organizer" className="text-[var(--accent)] mt-4 inline-block hover:underline">
          ← Organizer
        </Link>
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

  const statusPillClass =
    event.status === "published"
      ? "bg-green-500/20 text-green-400"
      : event.status === "archived"
        ? "bg-[var(--muted)]/20 text-[var(--muted)]"
        : "bg-amber-500/20 text-amber-400";

  const tabs: { id: TabId; label: string }[] = [
    { id: "wods", label: "WODs" },
    { id: "participants", label: "Participants" },
    { id: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Organizer
      </Link>

      {/* Bannière (photo ou placeholder) + boutons Modifier le profil / Changer la bannière */}
      {bannerCropSrc && (
        <ImageCropModal
          imageSrc={bannerCropSrc}
          aspect={21 / 9}
          fileName="banner.jpg"
          onConfirm={handleBannerCropConfirm}
          onCancel={handleBannerCropCancel}
        />
      )}
      <div className="relative w-full rounded-xl overflow-hidden mb-6" style={{ maxWidth: "100%" }}>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          aria-label="Choisir une photo de bannière"
          onChange={handleBannerFileSelect}
        />
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
                <div className="flex flex-wrap items-end justify-between gap-4 w-full">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                    {event.title}
                  </h1>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusPillClass}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-end bg-gradient-to-br from-[var(--accent)]/90 to-amber-600/90 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4 w-full">
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                  {event.title}
                </h1>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusPillClass}`}>
                  {event.status}
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Boutons sur la bannière : Modifier le profil + Changer la bannière */}
        <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
          <Link
            href={`/organizer/events/${eventId}/edit`}
            className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-black/55 hover:border-white/35 hover:scale-[1.02] transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le profil
          </Link>
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-black shadow-xl ring-2 ring-black/20 transition-all " +
              (bannerUploading
                ? "bg-[var(--accent)]/80 opacity-80 cursor-wait"
                : "bg-[var(--accent)] hover:opacity-95 hover:scale-[1.03] cursor-pointer")
            }
            aria-label="Changer la bannière"
          >
            {bannerUploading ? (
              "Envoi…"
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Changer la bannière
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dates + type */}
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
      {/* Description */}
      {event.description && (
        <div className="mb-8 max-w-3xl">
          <p className="text-[var(--foreground)] whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Onglets */}
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

      {/* Contenu WODs */}
      {activeTab === "wods" && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">WODs</h2>
            <Link
              href={`/organizer/workouts/new?eventId=${eventId}`}
              className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
            >
              Créer un WOD
            </Link>
          </div>
          {workouts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-[var(--muted)] mb-4">Aucun WOD pour cet événement.</p>
              <Link
                href={`/organizer/workouts/new?eventId=${eventId}`}
                className="inline-block rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90"
              >
                Créer un WOD
              </Link>
            </Card>
          ) : (
            <ul className="space-y-3">
              {workouts.map((w) => {
                const count = leaderboards.filter((lb) => lb.workoutId === w.id).length;
                return (
                  <li key={w.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-2">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[var(--muted)] text-sm">
                          {count} leaderboard{count !== 1 ? "s" : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkout(w)}
                          disabled={deletingWorkoutId === w.id}
                          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Supprimer ce WOD"
                        >
                          {deletingWorkoutId === w.id ? "Suppression…" : "Supprimer"}
                        </button>
                      </div>
                    </Card>
                  </li>
                );
              })}
              <li>
                <Link
                  href={`/organizer/workouts/new?eventId=${eventId}`}
                  className="inline-flex items-center gap-2 text-[var(--accent)] font-medium hover:underline"
                >
                  + Ajouter un autre WOD
                </Link>
              </li>
            </ul>
          )}
        </section>
      )}

      {/* Contenu Participants */}
      {activeTab === "participants" && (
        <section>
          <h2 className="text-xl font-bold mb-4">Participants</h2>
          <Card className="mb-6">
            <p className="text-[var(--muted)] text-sm mb-3">
              Ajoutez des participants par email. Ils recevront un compte athlète lorsqu&apos;ils s&apos;inscriront avec cet email. Les athlètes peuvent aussi s&apos;inscrire depuis la page publique de l&apos;événement.
            </p>
            <form onSubmit={handleAddParticipant} className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="participant-email" className="block text-sm font-medium mb-1">Email *</label>
                <input
                  id="participant-email"
                  type="email"
                  value={addParticipantEmail}
                  onChange={(e) => setAddParticipantEmail(e.target.value)}
                  placeholder="participant@exemple.com"
                  required
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] w-64"
                />
              </div>
              <div>
                <label htmlFor="participant-name" className="block text-sm font-medium mb-1">Nom</label>
                <input
                  id="participant-name"
                  type="text"
                  value={addParticipantName}
                  onChange={(e) => setAddParticipantName(e.target.value)}
                  placeholder="Nom affiché"
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] w-48"
                />
              </div>
              <div>
                <label htmlFor="participant-division" className="block text-sm font-medium mb-1">Division</label>
                <select
                  id="participant-division"
                  value={addParticipantDivision}
                  onChange={(e) => setAddParticipantDivision(e.target.value as Division)}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={addingParticipant}
                className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {addingParticipant ? "Ajout…" : "Ajouter un participant"}
              </button>
            </form>
          </Card>
          {participants.length === 0 ? (
            <Card>
              <p className="text-[var(--muted)]">Aucun participant inscrit pour le moment.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {participants.map((reg) => (
                <li key={reg.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium text-[var(--foreground)]">
                        {reg.displayName || reg.email || reg.userId || "—"}
                      </span>
                      {!reg.userId && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(En attente de compte)</span>
                      )}
                    </div>
                    <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                      {reg.division}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Contenu Leaderboard : 1 leaderboard par événement, catégories = filtres */}
      {activeTab === "leaderboard" && (
        <section>
          <h2 className="text-xl font-bold mb-4">Classement</h2>
          {leaderboards.length === 0 ? (
            <Card>
              <p className="text-[var(--muted)] mb-2">Aucun classement tant qu&apos;il n&apos;y a pas de WOD créé.</p>
              <Link href={`/organizer/workouts/new?eventId=${eventId}`} className="text-[var(--accent)] hover:underline">
                Créer un WOD →
              </Link>
            </Card>
          ) : (
            <>
              <p className="text-[var(--muted)] text-sm mb-3">
                Un seul classement pour l&apos;événement. Les catégories (M_RX, M_SCALED, F_RX, F_SCALED) sont des filtres sur la page classement.
              </p>
              <ul className="space-y-3">
                {leaderboards.map((lb) => {
                  const isEventLeaderboard = lb.workoutId == null;
                  const workout = isEventLeaderboard ? null : workouts.find((w) => w.id === lb.workoutId);
                  return (
                    <li key={lb.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          {isEventLeaderboard ? "Classement de l'événement" : (workout?.name ?? "WOD")}
                        </span>
                        {lb.division != null && (
                          <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                            {lb.division}
                          </span>
                        )}
                        <Link
                          href={`/leaderboards/${lb.id}`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          Voir le classement →
                        </Link>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </Layout>
  );
}

export default function OrganizerEventPage() {
  return (
    <OrganizerRoute>
      <OrganizerEventContent />
    </OrganizerRoute>
  );
}
