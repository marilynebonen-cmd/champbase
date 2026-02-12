"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getEvent, getGymsByOwner, updateEvent } from "@/lib/db";
import type { EventType, EventStatus } from "@/types";

function toInputDateTime(d: Date | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date((d as { seconds?: number }).seconds ? (d as { seconds: number }).seconds * 1000 : 0);
  return date.toISOString().slice(0, 16);
}

/**
 * Page d’édition du profil de la compétition (titre, description, type, statut, dates, gym).
 */
function EditEventContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState<Awaited<ReturnType<typeof getGymsByOwner>>>([]);
  const [gymId, setGymId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("online");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then((ev) => {
        if (!ev) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setGymId(ev.gymId ?? "");
        setTitle(ev.title ?? "");
        setDescription(ev.description ?? "");
        setType(ev.type ?? "online");
        setStatus(ev.status ?? "draft");
        setStartDate(toInputDateTime(ev.startDate instanceof Date ? ev.startDate : ev.startDate as unknown as Date));
        setEndDate(toInputDateTime(ev.endDate instanceof Date ? ev.endDate : ev.endDate as unknown as Date));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (!user) return;
    getGymsByOwner(user.uid).then(setGyms).catch(() => setGyms([]));
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!eventId) return;
    if (!gymId.trim()) {
      setError("Veuillez sélectionner un gym.");
      return;
    }
    setSubmitting(true);
    try {
      await updateEvent(eventId, {
        gymId: gymId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      router.push(`/organizer/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
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
  if (notFound) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Événement introuvable.</p>
        <Link href="/organizer" className="text-[var(--accent)] mt-4 inline-block hover:underline">
          ← Organizer
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href={`/organizer/events/${eventId}`} className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Retour à l&apos;événement
      </Link>
      <h1 className="text-3xl font-bold mb-6">Modifier la compétition</h1>
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
              <option value="archived">Archivé</option>
            </select>
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
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function EditEventPage() {
  return (
    <OrganizerRoute>
      <EditEventContent />
    </OrganizerRoute>
  );
}
