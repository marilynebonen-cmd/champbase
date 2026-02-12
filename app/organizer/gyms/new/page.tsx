"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createGym } from "@/lib/db";

function NewGymContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      const msg = "You must be logged in to create a gym.";
      console.error("[Create gym] No user:", msg);
      setError(msg);
      addToast(msg, "error");
      return;
    }

    const uid = user.uid;
    if (!uid) {
      const msg = "User UID is missing. Please sign out and sign in again.";
      console.error("[Create gym] user.uid is undefined");
      setError(msg);
      addToast(msg, "error");
      return;
    }

    const payload = {
      name: name.trim(),
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      ownerUid: uid,
    };
    console.log("[Create gym] Submitting, user.uid:", uid, "payload:", payload);

    setSubmitting(true);
    try {
      const gymId = await createGym(payload);
      console.log("[Create gym] Success, gymId:", gymId);
      addToast("Gym created successfully.");
      router.push("/organizer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Create failed";
      console.error("[Create gym] Error:", err);
      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Organizer
      </Link>
      <h1 className="text-3xl font-bold mb-6">Create gym</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gym name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create gym"}
          </button>
        </form>
      </Card>
    </Layout>
  );
}

export default function NewGymPage() {
  return (
    <OrganizerRoute>
      <NewGymContent />
    </OrganizerRoute>
  );
}
