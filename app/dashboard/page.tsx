"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/ImageCropModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUser,
  getGym,
  getGymsList,
  getRegistrationsByUser,
  getEvent,
  updateUserProfile,
  updateUserPhoto,
  getPendingRegistrationsByEmail,
  updateRegistrationUserId,
} from "@/lib/db";
import { uploadImageAndGetURL } from "@/lib/storage";
import { resizeImageToProfileLogo } from "@/lib/bannerImage";
import type { UserProfile } from "@/types";
import type { EventWithId } from "@/types";
import type { EventRegistrationWithId } from "@/types";
import type { GymWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

/**
 * Dashboard: profil (nom, prénom, club, date de naissance), section Athlete avec
 * liens leaderboards / soumettre score, et événements auxquels l'athlète est inscrit.
 */
function DashboardContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationWithId[]>(
    []
  );
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [registrationsIndexRequired, setRegistrationsIndexRequired] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editAffiliatedGymId, setEditAffiliatedGymId] = useState("");
  const [editPreferredDivision, setEditPreferredDivision] = useState<Division | "">("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoCropSrc, setPhotoCropSrc] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const first = editFirstName.trim();
      const last = editLastName.trim();
      const displayName = [first, last].filter(Boolean).join(" ") || undefined;
      const gymId = editAffiliatedGymId.trim();
      await updateUserProfile(user.uid, {
        firstName: first || undefined,
        lastName: last || undefined,
        displayName,
        dateOfBirth: editDateOfBirth.trim() || undefined,
        affiliatedGymId: gymId || undefined, // Empty string becomes undefined, then converted to null in updateUserProfile
        preferredDivision: editPreferredDivision || undefined,
      });
      const updated = await getUser(user.uid);
      setProfile(updated ?? null);
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleProfilePhotoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return;
    setPhotoCropSrc(URL.createObjectURL(file));
  }

  async function handleProfilePhotoCropConfirm(croppedFile: File) {
    if (photoCropSrc) URL.revokeObjectURL(photoCropSrc);
    setPhotoCropSrc(null);
    if (!user) return;
    setPhotoUploading(true);
    try {
      const fileToUpload = await resizeImageToProfileLogo(croppedFile).catch(() => croppedFile);
      const path = `users/${user.uid}/profile.jpg`;
      const url = await uploadImageAndGetURL(fileToUpload, path);
      await updateUserPhoto(user.uid, url);
      setProfile((p) => (p ? { ...p, photoURL: url } : null));
    } catch (err) {
      console.error("[Profile photo upload]", err);
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleProfilePhotoCropCancel() {
    if (photoCropSrc) URL.revokeObjectURL(photoCropSrc);
    setPhotoCropSrc(null);
  }

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then(setProfile);
  }, [user]);

  useEffect(() => {
    getGymsList(100).then(setGyms).catch(() => setGyms([]));
  }, []);

  useEffect(() => {
    if (!editingProfile || !profile) return;
    let first = profile.firstName ?? "";
    let last = profile.lastName ?? "";
    if (!first && !last && profile.displayName?.trim()) {
      const parts = profile.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        first = parts[0] ?? "";
        last = parts.slice(1).join(" ") ?? "";
      } else {
        first = parts[0] ?? "";
      }
    }
    setEditFirstName(first);
    setEditLastName(last);
    setEditDateOfBirth(profile.dateOfBirth ?? "");
    setEditAffiliatedGymId(profile.affiliatedGymId ?? "");
    setEditPreferredDivision(profile.preferredDivision ?? "");
  }, [editingProfile, profile]);

  // Lier les inscriptions en attente (ajoutées par l'organisateur) quand l'utilisateur se connecte avec cet email
  useEffect(() => {
    if (!user?.email) return;
    const email = user.email.trim().toLowerCase();
    getPendingRegistrationsByEmail(email)
      .then((pending) => {
        if (pending.length === 0) return;
        return Promise.all(
          pending.map((reg) => updateRegistrationUserId(reg.id, user.uid))
        ).then(() =>
          getUser(user.uid).then((p) => {
            if (p)
              return updateUserProfile(user.uid, {
                roles: { athlete: true, organizer: p.roles?.organizer ?? false },
              });
          })
        );
      })
      .catch(() => {});
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!profile?.affiliatedGymId) {
      setClubName(null);
      return;
    }
    getGym(profile.affiliatedGymId).then((g) =>
      setClubName(g ? g.name : null)
    );
  }, [profile?.affiliatedGymId]);

  useEffect(() => {
    if (!user) return;
    getRegistrationsByUser(user.uid)
      .then((result) => {
        setRegistrations(result.registrations);
        setRegistrationsIndexRequired(result.indexRequired ?? false);
        return Promise.all(
          result.registrations.map((r) => getEvent(r.eventId))
        ).then((evs) =>
          setEvents(evs.filter((e): e is EventWithId => e !== null))
        );
      })
      .catch((err) => {
        console.error("[Dashboard] getRegistrationsByUser failed:", err);
        setRegistrations([]);
        setRegistrationsIndexRequired(true);
      });
  }, [user]);

  return (
    <Layout>
      <h1 className="heading-1 mb-8">Dashboard</h1>

      {registrationsIndexRequired && (
        <div
          className="mb-6 rounded-xl border border-[var(--card-border-hover)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--foreground)]"
          role="alert"
        >
          Firestore index required. Create it in Firebase console and reload.
        </div>
      )}

      {/* Profil: photo + name + boutons Athlete / Organisateur */}
      <Card className="mb-8">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          aria-label="Choisir une photo de profil"
          onChange={handleProfilePhotoFileSelect}
        />
        {photoCropSrc && (
          <ImageCropModal
            imageSrc={photoCropSrc}
            aspect={1}
            fileName="profile.jpg"
            onConfirm={handleProfilePhotoCropConfirm}
            onCancel={handleProfilePhotoCropCancel}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <Link href="/profile" className="block">
              <Avatar
                photoURL={profile?.photoURL}
                displayName={profile?.displayName}
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                size="lg"
              />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="text-[var(--accent)]"
            >
              {photoUploading ? "Envoi…" : "Changer la photo"}
            </Button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="heading-2">Mon profil</h2>
              {!editingProfile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                  aria-label="Modifier mon profil"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  }
                >
                  Modifier
                </Button>
              )}
            </div>
            <p className="text-[var(--foreground)] font-medium mt-1">
              {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
                profile?.displayName ||
                user?.email ||
                "—"}
            </p>
          </div>
        </div>
        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="pt-4 border-t border-[var(--card-border)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dashboard-firstName" className="block text-sm font-medium text-[var(--muted)] mb-1">Prénom</label>
                <input
                  id="dashboard-firstName"
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="dashboard-lastName" className="block text-sm font-medium text-[var(--muted)] mb-1">Nom</label>
                <input
                  id="dashboard-lastName"
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="dashboard-dob" className="block text-sm font-medium text-[var(--muted)] mb-1">Date de naissance</label>
                <input
                  id="dashboard-dob"
                  type="date"
                  value={editDateOfBirth}
                  onChange={(e) => setEditDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="dashboard-gym" className="block text-sm font-medium text-[var(--muted)] mb-1">Club affilié</label>
                <select
                  id="dashboard-gym"
                  value={editAffiliatedGymId}
                  onChange={(e) => setEditAffiliatedGymId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="">— Aucun —</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                      {(g.city || g.country) ? ` · ${[g.city, g.country].filter(Boolean).join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dashboard-division" className="block text-sm font-medium text-[var(--muted)] mb-1">Division préférée</label>
                <select
                  id="dashboard-division"
                  value={editPreferredDivision}
                  onChange={(e) => setEditPreferredDivision(e.target.value as Division | "")}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="">— Aucune —</option>
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                disabled={savingProfile}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {(() => {
              const nameAtTop = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.displayName || "";
              const parts = nameAtTop.trim().split(/\s+/);
              const derivedFirst = profile?.firstName ?? (parts[0] || "");
              const derivedLast = profile?.lastName ?? (parts.length > 1 ? parts.slice(1).join(" ") : "");
              return (
                <>
                  <div>
                    <dt className="text-[var(--muted)]">Prénom</dt>
                    <dd className="font-medium">{derivedFirst || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Nom</dt>
                    <dd className="font-medium">{derivedLast || "—"}</dd>
                  </div>
                </>
              );
            })()}
            <div>
              <dt className="text-[var(--muted)]">Club affilié</dt>
              <dd className="font-medium">{clubName ?? profile?.affiliatedGymId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Date de naissance</dt>
              <dd className="font-medium">
                {profile?.dateOfBirth
                  ? new Date(profile.dateOfBirth + "T00:00:00").toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Email</dt>
              <dd className="font-medium">{user?.email ?? "—"}</dd>
            </div>
            {profile?.preferredDivision && (
              <div>
                <dt className="text-[var(--muted)]">Division préférée</dt>
                <dd className="font-medium">{profile.preferredDivision}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      {profile?.roles?.athlete && (
        <Card className="mb-8 hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:bg-[var(--card-hover)] transition-base">
          <h2 className="heading-2 mb-4">Athlete</h2>
          <p className="caption mb-6">
            Consulter les leaderboards et soumettre tes scores.
          </p>

          {/* Leaderboard de mon gym */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Leaderboard de mon gym</h3>
            {profile?.affiliatedGymId ? (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 space-y-3">
                <p className="font-medium text-[var(--foreground)]">
                  {clubName ?? profile.affiliatedGymId}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/gyms/${profile.affiliatedGymId}?tab=leaderboard`} size="sm">
                    Leaderboard du jour
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <p className="text-[var(--muted)] text-sm">
                Associe un club à ton profil pour voir le leaderboard de ton gym.{" "}
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="text-[var(--accent)] hover:underline"
                >
                  Modifier mon profil
                </button>
              </p>
            )}
          </div>

          {/* Événements auxquels je suis inscrit */}
          <div className="pt-6 border-t border-[var(--card-border)]">
            <h3 className="text-lg font-bold mb-3">
              Événements auxquels je suis inscrit
            </h3>
            {registrations.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">
                Aucune inscription pour le moment. Inscris-toi à un événement
                depuis la page{" "}
                <Link href="/events" className="text-[var(--accent)] hover:underline">
                  Événements
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3">
                {registrations.map((reg) => {
                  const ev = events.find((e) => e.id === reg.eventId);
                  return (
                    <li
                      key={reg.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--background)]"
                    >
                      <div>
                        <span className="font-semibold">
                          {ev?.title ?? "Événement"}
                        </span>
                        <span className="text-[var(--muted)] text-sm ml-2">
                          · {reg.division}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/events/${reg.eventId}`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          Voir le leaderboard
                        </Link>
                        <Link
                          href={`/leaderboards?eventId=${reg.eventId}&submit=1`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          Soumettre un score
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      )}

      {profile?.roles?.organizer && (
        <Card className="hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:bg-[var(--card-hover)] transition-base">
          <h2 className="heading-2 mb-4">Organizer</h2>
          <p className="caption mb-6">
            Créer des événements, workouts et leaderboards.
          </p>

          <div>
            <h3 className="text-lg font-bold mb-3">Panneau organisateur</h3>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 space-y-3">
              <p className="text-[var(--muted)] text-sm">
                Gérer tes événements, créer des WODs et des leaderboards.
              </p>
            <ButtonLink href="/organizer" size="sm" rightIcon={<span aria-hidden>→</span>}>
              Accéder au panneau
            </ButtonLink>
            </div>
          </div>
        </Card>
      )}

      {!profile?.roles?.athlete && !profile?.roles?.organizer && (
        <Card>
          <p className="text-[var(--muted)]">
            Aucun rôle actif. Modifie ton{" "}
            <Link href="/profile" className="text-[var(--accent)] hover:underline">
              profil
            </Link>{" "}
            ou contacte un organisateur.
          </p>
        </Card>
      )}
    </Layout>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
