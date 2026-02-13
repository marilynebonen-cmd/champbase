"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { getGymsList } from "@/lib/db";
import type { GymWithId } from "@/types";

/**
 * Liste des gyms (clubs), avec recherche par nom / ville / pays.
 * Même principe que la page Événements.
 */
function GymsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGymsList(100)
      .then((list) => {
        if (!cancelled) setGyms(list);
      })
      .catch(() => {
        if (!cancelled) setGyms([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGyms = query
    ? gyms.filter(
        (gym) =>
          gym.name.toLowerCase().includes(query) ||
          gym.city?.toLowerCase().includes(query) ||
          gym.country?.toLowerCase().includes(query)
      )
    : gyms;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="heading-1">
          {query ? `Résultats pour "${searchParams.get("q")}"` : "Gyms"}
        </h1>
        {query && (
          <p className="caption mt-2">{filteredGyms.length} gym(s)</p>
        )}
      </div>

      {loading ? (
        <p className="caption">Chargement…</p>
      ) : filteredGyms.length === 0 ? (
        <Card>
          <p className="caption">
            {query
              ? "Aucun gym trouvé."
              : "Aucun gym pour le moment."}
          </p>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGyms.map((gym, i) => (
            <li
              key={gym.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              <Link href={`/gyms/${gym.id}`} className="block h-full">
                <Card hover className="h-full overflow-hidden p-0 flex flex-col">
                  {gym.imageUrl ? (
                    <div className="relative w-full aspect-[16/10] bg-[var(--card)] rounded-t-xl overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gym.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full aspect-[16/10] rounded-t-xl shrink-0 flex items-center justify-center text-4xl font-bold text-white/90 bg-gradient-to-br from-blue-500 to-purple-600"
                      aria-hidden
                    >
                      {gym.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="heading-3 mb-1">{gym.name}</h2>
                    <p className="caption">
                      {[gym.city, gym.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}

export default function GymsPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <h1 className="heading-1 mb-8">Gyms</h1>
          <p className="caption">Chargement…</p>
        </Layout>
      }
    >
      <GymsContent />
    </Suspense>
  );
}
