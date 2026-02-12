"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getWod, updateWod } from "@/lib/db";
import type { WodScoreType, WodDefaultTrack } from "@/types";

function EditWodContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const wodId = typeof params.wodId === "string" ? params.wodId : "";
  const gymId = searchParams.get("gymId") ?? "";
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [descriptionRx, setDescriptionRx] = useState("");
  const [descriptionScaled, setDescriptionScaled] = useState("");
  const [defaultTrack, setDefaultTrack] = useState<WodDefaultTrack>("rx");
  const [wodDate, setWodDate] = useState("");
  const [scoreType, setScoreType] = useState<WodScoreType>("reps");
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!gymId || !wodId) {
      setLoading(false);
      if (!gymId) setNotFound(true);
      return;
    }
    getWod(gymId, wodId)
      .then((wod) => {
        if (!wod) {
          setNotFound(true);
          return;
        }
        setTitle(wod.title);
        setDescriptionRx(wod.descriptionRx ?? wod.description ?? "");
        setDescriptionScaled(wod.descriptionScaled ?? "");
        setDefaultTrack(wod.defaultTrack ?? "rx");
        setWodDate(wod.wodDate ?? "");
        setScoreType(wod.scoreType);
        setIsPublished(wod.isPublished ?? false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [gymId, wodId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gymId || !wodId) return;
    setSubmitting(true);
    try {
      await updateWod(gymId, wodId, {
        title: title.trim(),
        descriptionRx: descriptionRx.trim() || undefined,
        descriptionScaled: descriptionScaled.trim() || undefined,
        defaultTrack,
        wodDate: wodDate.trim() || undefined,
        scoreType,
        isPublished,
      });
      addToast("WOD enregistré.");
      router.push("/organizer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement";
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

  if (notFound || !gymId) {
    return (
      <Layout>
        <p className="text-[var(--muted)] mb-4">WOD introuvable ou gym manquant.</p>
        <Link href="/organizer" className="text-[var(--accent)] hover:underline">
          ← Retour à l’Organizer
        </Link>
      </Layout>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Organizer
      </Link>
      <h1 className="heading-1 mb-6">Modifier le WOD</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Titre du WOD *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
              placeholder="ex: Fran, Cindy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Description RX (optionnel)</label>
            <textarea
              value={descriptionRx}
              onChange={(e) => setDescriptionRx(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="ex: ♀ 65 lb, 95 lb… / ♂ 95 lb, 135 lb…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Description Scaled (optionnel)</label>
            <textarea
              value={descriptionScaled}
              onChange={(e) => setDescriptionScaled(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Vue par défaut</label>
            <select
              value={defaultTrack}
              onChange={(e) => setDefaultTrack(e.target.value as WodDefaultTrack)}
              className={inputClass}
            >
              <option value="rx">RX</option>
              <option value="scaled">Scaled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Date du WOD (optionnel)</label>
            <DatePicker
              value={wodDate}
              onChange={setWodDate}
              placeholder="Choisir une date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Type de score *</label>
            <select
              value={scoreType}
              onChange={(e) => setScoreType(e.target.value as WodScoreType)}
              className={inputClass}
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
          {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </Card>
    </Layout>
  );
}

export default function EditWodPage() {
  return (
    <OrganizerRoute>
      <Suspense fallback={<Layout><p className="text-[var(--muted)]">Chargement…</p></Layout>}>
        <EditWodContent />
      </Suspense>
    </OrganizerRoute>
  );
}
