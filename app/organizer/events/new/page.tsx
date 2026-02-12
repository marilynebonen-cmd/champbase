"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getGymsByOwner, createEvent } from "@/lib/db";
import type { EventType, EventStatus } from "@/types";

function NewEventContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gymIdFromUrl = searchParams.get("gymId") ?? "";
  const [gyms, setGyms] = useState<Awaited<ReturnType<typeof getGymsByOwner>>>([]);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("online");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFetchError(null);
    getGymsByOwner(user.uid)
      .then((list) => {
        setGyms(list);
        setFetchError(null);
      })
      .catch((err) => {
        console.error("[Create event] getGymsByOwner failed:", err);
        setGyms([]);
        setFetchError(err instanceof Error ? err.message : "Impossible de charger les gyms");
      })
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
      setError("Veuillez sélectionner un gym.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createEvent({
        gymId: gymId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        isPublic: status === "published",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        createdByUid: user.uid,
      });
      router.push(`/organizer/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la création");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Organizer
      </Link>
      <h1 className="text-3xl font-bold mb-6">Créer un événement</h1>
      {fetchError && (
        <Card className="mb-6 border-red-500/50 bg-red-500/10">
          <p className="text-red-400 font-medium">Erreur lors du chargement des gyms</p>
          <p className="text-sm text-[var(--muted)] mt-1">{fetchError}</p>
        </Card>
      )}
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
            {gyms.length > 0 && (
              <p className="text-[var(--muted)] text-sm mt-1">
                <Link href="/organizer/gyms" className="text-[var(--accent)] hover:underline">
                  Voir tous mes gyms
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="online">En ligne</option>
              <option value="live">Sur place</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
            <p className="text-[var(--muted)] text-xs mt-1">
              <strong>Publié</strong> : visible sur la page d&apos;accueil et sur Événements, pour tous (sans connexion).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date de début</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date de fin</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || gyms.length === 0}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer l’événement"}
          </button>
          {gyms.length === 0 && (
            <p className="text-[var(--muted)] text-sm">Créez d’abord un gym pour organiser des événements.</p>
          )}
        </form>
      </Card>
    </Layout>
  );
}

export default function NewEventPage() {
  return (
    <OrganizerRoute>
      <Suspense fallback={<Layout><p className="text-[var(--muted)]">Chargement…</p></Layout>}>
        <NewEventContent />
      </Suspense>
    </OrganizerRoute>
  );
}
