"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/ImageCropModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUser,
  updateUserProfile,
  updateUserPhoto,
  getGymsList,
} from "@/lib/db";
import { uploadImageAndGetURL } from "@/lib/storage";
import { resizeImageToProfileLogo } from "@/lib/bannerImage";
import type { UserProfile } from "@/types";
import type { GymWithId } from "@/types";
import { DIVISIONS, type Division } from "@/types";

/**
 * Page Profil : design pro, sections claires, photo avec bouton « Changer la photo ».
 */
function ProfileContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [affiliatedGymId, setAffiliatedGymId] = useState("");
  const [preferredDivision, setPreferredDivision] = useState<Division | "">("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoCropSrc, setPhotoCropSrc] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then((p) => {
      setProfile(p ?? null);
      setFirstName(p?.firstName ?? "");
      setLastName(p?.lastName ?? "");
      setDisplayName(p?.displayName ?? "");
      setDateOfBirth(p?.dateOfBirth ?? "");
      setAffiliatedGymId(p?.affiliatedGymId ?? "");
      setPreferredDivision(p?.preferredDivision ?? "");
      setPhotoURL(p?.photoURL ?? "");
    });
  }, [user]);

  useEffect(() => {
    getGymsList().then(setGyms);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName || `${firstName} ${lastName}`.trim() || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        affiliatedGymId: affiliatedGymId || undefined,
        preferredDivision: preferredDivision || undefined,
        photoURL: photoURL || undefined,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: displayName || `${firstName} ${lastName}`.trim(),
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              dateOfBirth: dateOfBirth || undefined,
              affiliatedGymId: affiliatedGymId || undefined,
              preferredDivision: preferredDivision || undefined,
              photoURL: photoURL || undefined,
            }
          : null
      );
    } finally {
      setSaving(false);
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
      setPhotoURL(url);
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

  const inputClass =
    "w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-[var(--muted-foreground)] mb-2";

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Profil</h1>
          <p className="caption">
            Gère tes informations personnelles et ton club affilié.
          </p>
        </div>

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

        {/* Bloc Photo */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-8">
            <div className="flex flex-col items-center sm:items-start gap-4">
              <Avatar
                photoURL={photoURL || null}
                displayName={displayName || `${firstName} ${lastName}`.trim()}
                firstName={firstName}
                lastName={lastName}
                size="lg"
                className="w-28 h-28 text-3xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
              >
                {photoUploading ? "Envoi…" : "Changer la photo"}
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="heading-3 mb-1">Photo de profil</h2>
              <p className="caption">
                Utilisée sur ton profil et les leaderboards. JPEG, PNG ou WebP, recadrage carré.
              </p>
            </div>
          </div>
        </Card>

        {/* Bloc Informations */}
        <Card>
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <h2 className="heading-2 mb-1">Informations personnelles</h2>
              <p className="caption mb-6">
                Ces informations peuvent être affichées sur les leaderboards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="profile-firstName" className={labelClass}>
                    Prénom
                  </label>
                  <input
                    id="profile-firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="profile-lastName" className={labelClass}>
                    Nom
                  </label>
                  <input
                    id="profile-lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="profile-displayName" className={labelClass}>
                    Nom d&apos;affichage <span className="text-[var(--muted)] font-normal">(optionnel)</span>
                  </label>
                  <input
                    id="profile-displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sert sur les leaderboards"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className={labelClass}>
                    Email
                  </label>
                  <p id="profile-email" className="py-3 text-[var(--muted)] text-sm">
                    {user?.email}
                  </p>
                </div>
                <div>
                  <label htmlFor="profile-dateOfBirth" className={labelClass}>
                    Date de naissance
                  </label>
                  <input
                    id="profile-dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--card-border)]">
              <h2 className="heading-3 mb-1">Club & compétition</h2>
              <p className="caption mb-6">
                Ton club pour le leaderboard du jour et ta division pour les événements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="profile-gym" className={labelClass}>
                    Club affilié
                  </label>
                  <select
                    id="profile-gym"
                    value={affiliatedGymId}
                    onChange={(e) => setAffiliatedGymId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Aucun —</option>
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                        {(g.city || g.country) ? ` · ${[g.city, g.country].filter(Boolean).join(", ")}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[var(--muted)] text-xs mt-2">
                    Choisis ton club pour apparaître sur la page du centre.
                  </p>
                </div>
                <div>
                  <label htmlFor="profile-division" className={labelClass}>
                    Division préférée
                  </label>
                  <select
                    id="profile-division"
                    value={preferredDivision}
                    onChange={(e) => setPreferredDivision(e.target.value as Division | "")}
                    className={inputClass}
                  >
                    <option value="">— Aucune —</option>
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {profile && (
              <div className="pt-6 border-t border-[var(--card-border)]">
                <span className="text-sm font-medium text-[var(--muted-foreground)]">Rôles </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                      profile.roles.athlete
                        ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                        : "bg-[var(--card-border)] text-[var(--muted)]"
                    }`}
                  >
                    Athlete {profile.roles.athlete ? "✓" : "—"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                      profile.roles.organizer
                        ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                        : "bg-[var(--card-border)] text-[var(--muted)]"
                    }`}
                  >
                    Organizer {profile.roles.organizer ? "✓" : "—"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-base">
                Retour au dashboard
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
