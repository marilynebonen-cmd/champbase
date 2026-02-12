"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedEvents, getEventsByCreator } from "@/lib/db";
import type { EventWithId } from "@/types";

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
 */
export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedEvents()
      .then((published) => {
        setEvents(published);
        if (published.length === 0 && user?.uid) {
          getEventsByCreator(user.uid)
            .then((mine) => setEvents(mine))
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("[Events] getPublishedEvents failed:", err);
        if (user?.uid) {
          getEventsByCreator(user.uid).then(setEvents).catch(() => setEvents([]));
        } else {
          setEvents([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <Layout>
      <h1 className="heading-1 mb-8">Événements</h1>
      {loading ? (
        <p className="caption">Chargement…</p>
      ) : events.length === 0 ? (
        <Card>
          <p className="caption">Aucun événement public pour le moment.</p>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => {
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
      )}
    </Layout>
  );
}
