"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getGymsByOwner, createWod } from "@/lib/db";
import type { WodScoreType, WodDefaultTrack } from "@/types";

function NewWodContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gymIdFromUrl = searchParams.get("gymId") ?? "";
  const { addToast } = useToast();
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState("");
  const [title, setTitle] = useState("");
  const [descriptionRx, setDescriptionRx] = useState("");
  const [descriptionScaled, setDescriptionScaled] = useState("");
  const [defaultTrack, setDefaultTrack] = useState<WodDefaultTrack>("rx");
  const [wodDate, setWodDate] = useState("");
  const [scoreType, setScoreType] = useState<WodScoreType>("reps");
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getGymsByOwner(user.uid)
      .then((list) => setGyms(list))
      .catch(() => setGyms([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (gymIdFromUrl && gyms.some((g) => g.id === gymIdFromUrl) && !gymId) {
      setGymId(gymIdFromUrl);
    }
  }, [gymIdFromUrl, gyms, gymId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!gymId.trim()) {
      setError("Sélectionnez un gym.");
      return;
    }
    setSubmitting(true);
    try {
      const wodId = await createWod(gymId.trim(), {
        title: title.trim(),
        descriptionRx: descriptionRx.trim() || undefined,
        descriptionScaled: descriptionScaled.trim() || undefined,
        defaultTrack,
        wodDate: wodDate.trim() || undefined,
        scoreType,
        createdByUid: user.uid,
        isPublished,
        eventId: null,
      });
      addToast("WOD créé.");
      router.push(`/organizer?gymId=${gymId}&wodId=${wodId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec de la création";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
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
      <h1 className="text-3xl font-bold mb-6">Créer un WOD</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gym *</label>
            <select
              value={gymId}
              onChange={(e) => setGymId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="">Sélectionner un gym</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {gyms.length === 0 && (
              <p className="text-[var(--muted)] text-sm mt-1">
                <Link href="/organizer/gyms/new" className="text-[var(--accent)] hover:underline">
                  Créez d’abord un gym
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Titre du WOD *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              placeholder="ex: Fran, Cindy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description RX (optionnel)</label>
            <textarea
              value={descriptionRx}
              onChange={(e) => setDescriptionRx(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
              placeholder="ex: ♀ 65 lb, 95 lb… / ♂ 95 lb, 135 lb…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description Scaled (optionnel)</label>
            <textarea
              value={descriptionScaled}
              onChange={(e) => setDescriptionScaled(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vue par défaut</label>
            <select
              value={defaultTrack}
              onChange={(e) => setDefaultTrack(e.target.value as WodDefaultTrack)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="rx">RX</option>
              <option value="scaled">Scaled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date du WOD (optionnel)</label>
            <DatePicker
              value={wodDate}
              onChange={setWodDate}
              placeholder="Choisir une date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type de score *</label>
            <select
              value={scoreType}
              onChange={(e) => setScoreType(e.target.value as WodScoreType)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="time">Temps (plus bas = mieux)</option>
              <option value="reps">Reps (plus haut = mieux)</option>
              <option value="weight">Poids (plus haut = mieux)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-[var(--card-border)]"
            />
            <label htmlFor="isPublished" className="text-sm">
              Publié (visible par les athlètes)
            </label>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || gyms.length === 0}
            className="w-full sm:w-auto rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer le WOD"}
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function NewWodPage() {
  return (
    <OrganizerRoute>
      <Suspense fallback={<Layout><p className="text-[var(--muted)]">Chargement…</p></Layout>}>
        <NewWodContent />
      </Suspense>
    </OrganizerRoute>
  );
}
