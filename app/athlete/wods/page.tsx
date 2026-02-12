"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { getGymsList, getPublishedWodsByGym } from "@/lib/db";
import { getWodDisplayDescription } from "@/lib/wodScoreUtils";
import type { GymWithId } from "@/types";
import type { WodWithId } from "@/types";

function WodsListContent() {
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [gymId, setGymId] = useState("");
  const [wods, setWods] = useState<WodWithId[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingWods, setLoadingWods] = useState(false);

  useEffect(() => {
    getGymsList(100)
      .then(setGyms)
      .catch(() => setGyms([]))
      .finally(() => setLoadingGyms(false));
  }, []);

  useEffect(() => {
    if (!gymId) {
      setWods([]);
      return;
    }
    setLoadingWods(true);
    getPublishedWodsByGym(gymId, 50)
      .then(setWods)
      .catch(() => setWods([]))
      .finally(() => setLoadingWods(false));
  }, [gymId]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-2">WODs</h1>
      <p className="text-[var(--muted)] mb-6">
        Choisissez un gym pour voir les WODs publiés et soumettre vos scores.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Gym</label>
        <select
          value={gymId}
          onChange={(e) => setGymId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="">Sélectionner un gym</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {(g.city || g.country) ? ` — ${[g.city, g.country].filter(Boolean).join(", ")}` : ""}
            </option>
          ))}
        </select>
        {loadingGyms && <p className="text-[var(--muted)] text-sm mt-1">Chargement des gyms…</p>}
      </div>

      {!gymId && (
        <Card>
          <p className="text-[var(--muted)]">Sélectionnez un gym pour afficher les WODs.</p>
        </Card>
      )}

      {gymId && loadingWods && (
        <p className="text-[var(--muted)]">Chargement des WODs…</p>
      )}

      {gymId && !loadingWods && wods.length === 0 && (
        <Card>
          <p className="text-[var(--muted)]">Aucun WOD publié pour ce gym.</p>
        </Card>
      )}

      {gymId && !loadingWods && wods.length > 0 && (
        <ul className="space-y-4">
          {wods.map((w) => (
            <li key={w.id}>
              <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg text-[var(--foreground)]">{w.title}</h3>
                  {(w.descriptionRx ?? w.description ?? w.descriptionScaled) && (
                    <p className="text-[var(--muted)] text-sm mt-1 line-clamp-2">
                      {getWodDisplayDescription(w, w.defaultTrack ?? "rx")}
                    </p>
                  )}
                  <span className="inline-block mt-2 rounded-lg px-2.5 py-1 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                    {w.scoreType === "time" ? "Temps" : w.scoreType === "reps" ? "Reps" : "Poids"}
                  </span>
                </div>
                <div className="shrink-0">
                  <ButtonLink
                    href={`/athlete/wods/${w.id}?gymId=${gymId}`}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Voir & soumettre score
                  </ButtonLink>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}

export default function AthleteWodsPage() {
  return (
    <ProtectedRoute>
      <WodsListContent />
    </ProtectedRoute>
  );
}
