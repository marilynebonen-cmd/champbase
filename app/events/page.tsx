"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedEvents, getEventsByCreator, getGymsList } from "@/lib/db";
import type { EventWithId, GymWithId } from "@/types";

function EventCardImage({ event }: { event: EventWithId }) {
  if (event.imageUrl) {
    return (
      <div className="relative w-full aspect-[16/10] bg-[var(--card)] rounded-t-xl overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="w-full aspect-[16/10] rounded-t-xl shrink-0 flex items-center justify-center text-4xl font-bold text-white/90 bg-gradient-to-br from-[var(--accent)] to-amber-600"
      aria-hidden
    >
      {event.title.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Public events list: published events with image (or placeholder) in card layout.
 * Also includes gym search results when query parameter is present.
 */
function EventsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase().trim() || "";
  
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      try {
        const [publishedEvents, allGyms] = await Promise.all([
          getPublishedEvents().catch(() => []),
          getGymsList(100).catch(() => [])
        ]);
        
        if (cancelled) return;
        
        let finalEvents = publishedEvents;
        if (publishedEvents.length === 0 && user?.uid) {
          try {
            const mine = await getEventsByCreator(user.uid);
            if (!cancelled) finalEvents = mine;
          } catch {}
        }
        
        setEvents(finalEvents);
        setGyms(allGyms);
      } catch (err) {
        console.error("[Events] Failed to load data:", err);
        if (!cancelled) {
          setEvents([]);
          setGyms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);
  
  // Filter results based on query
  const filteredEvents = query
    ? events.filter((ev) =>
        ev.title.toLowerCase().includes(query) ||
        ev.description?.toLowerCase().includes(query)
      )
    : events;
    
  const filteredGyms = query
    ? gyms.filter((gym) =>
        gym.name.toLowerCase().includes(query) ||
        gym.city?.toLowerCase().includes(query) ||
        gym.country?.toLowerCase().includes(query)
      )
    : [];

  const hasResults = filteredEvents.length > 0 || filteredGyms.length > 0;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="heading-1">
          {query ? `Résultats pour "${searchParams.get("q")}"` : "Événements"}
        </h1>
        {query && (
          <p className="caption mt-2">
            {filteredEvents.length} événement(s) · {filteredGyms.length} gym(s)
          </p>
        )}
      </div>
      
      {loading ? (
        <p className="caption">Chargement…</p>
      ) : !hasResults ? (
        <Card>
          <p className="caption">
            {query ? "Aucun résultat trouvé." : "Aucun événement public pour le moment."}
          </p>
        </Card>
      ) : (
        <div className="space-y-12">
          {/* Gyms results (only shown when searching) */}
          {filteredGyms.length > 0 && (
            <section>
              <h2 className="heading-2 mb-6">Gyms</h2>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGyms.map((gym, i) => (
                  <li key={gym.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                    <Link href={`/gyms/${gym.id}`} className="block h-full">
                      <Card hover className="h-full overflow-hidden p-0 flex flex-col">
                        {gym.imageUrl ? (
                          <div className="relative w-full aspect-[16/10] bg-[var(--card)] rounded-t-xl overflow-hidden shrink-0">
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
                          <h3 className="heading-3 mb-1">{gym.name}</h3>
                          <p className="caption">
                            {[gym.city, gym.country].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          {/* Events results */}
          {filteredEvents.length > 0 && (
            <section>
              {query && filteredGyms.length > 0 && <h2 className="heading-2 mb-6">Événements</h2>}
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((ev, i) => {
                  const startStr =
                    ev.startDate instanceof Date
                      ? ev.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                      : "";
                  return (
                    <li key={ev.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                      <Link href={`/events/${ev.id}`} className="block h-full">
                        <Card hover className="h-full overflow-hidden p-0 flex flex-col">
                          <EventCardImage event={ev} />
                          <div className="p-5 flex flex-col flex-1">
                            <h2 className="heading-3 mb-1">{ev.title}</h2>
                            <p className="caption">
                              {ev.type === "live" ? "En présentiel" : "En ligne"} · {startStr}
                            </p>
                            {ev.description && (
                              <p className="text-[var(--muted)] text-sm mt-2 line-clamp-2">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </Layout>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <Layout>
        <h1 className="heading-1 mb-8">Événements</h1>
        <p className="caption">Chargement…</p>
      </Layout>
    }>
      <EventsContent />
    </Suspense>
  );
}
