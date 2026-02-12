"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { getPublishedEvents, getEventsByCreator, getGymsList } from "@/lib/db";
import type { EventWithId } from "@/types";
import type { GymWithId } from "@/types";

/**
 * Landing: search bar + événements + clubs/salles. SaaS-style layout and typography.
 */
export default function HomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [gyms, setGyms] = useState<GymWithId[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    const run = async () => {
      try {
        const published = await getPublishedEvents();
        if (cancelled) return;
        const byId = new Map<string, EventWithId>(published.map((e) => [e.id, e]));
        if (user?.uid) {
          try {
            const mine = await getEventsByCreator(user.uid);
            if (cancelled) return;
            mine.forEach((e) => byId.set(e.id, e));
          } catch {
            // keep published only
          }
        }
        const list = Array.from(byId.values()).sort((a, b) => {
          const ta = a.startDate instanceof Date ? a.startDate.getTime() : 0;
          const tb = b.startDate instanceof Date ? b.startDate.getTime() : 0;
          return tb - ta;
        });
        setEvents(list);
      } catch (err) {
        if (cancelled) return;
        console.error("[Home] getPublishedEvents failed:", err);
        if (user?.uid) {
          try {
            const mine = await getEventsByCreator(user.uid);
            if (!cancelled) setEvents(mine);
          } catch {
            setEvents([]);
          }
        } else {
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    getGymsList(50)
      .then(setGyms)
      .catch(() => setGyms([]))
      .finally(() => setLoadingGyms(false));
  }, []);

  const gymById = Object.fromEntries(gyms.map((g) => [g.id, g]));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/events?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/events");
    }
  }

  function eventDateStr(ev: EventWithId): string {
    const start =
      ev.startDate instanceof Date
        ? ev.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : "";
    const end =
      ev.endDate instanceof Date
        ? ev.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : "";
    return end && end !== start ? `${start} – ${end}` : start;
  }

  function eventLocation(ev: EventWithId): string {
    if (ev.type === "online") return "En ligne";
    const gym = gymById[ev.gymId];
    if (gym) return gym.name + (gym.city || gym.country ? ` · ${[gym.city, gym.country].filter(Boolean).join(", ")}` : "");
    return "—";
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="text-center py-16 sm:py-20 animate-fade-in">
        <h1 className="flex justify-center mb-6">
          <Logo variant="hero" link={false} />
        </h1>
        <p className="body-lg text-[var(--muted)] max-w-xl mx-auto mb-10">
          Leaderboards and events for gyms and athletes
        </p>
        <form onSubmit={handleSearch} className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search events or gyms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3.5 text-[var(--foreground)] placeholder:text-[var(--muted)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Events */}
      <section className="mt-16 sm:mt-20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="heading-2">Événements à venir</h2>
          <Link
            href="/events"
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-base"
          >
            Voir tous les événements →
          </Link>
        </div>
        {loadingEvents ? (
          <p className="caption">Chargement…</p>
        ) : events.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="caption mb-4">
              Aucun événement à afficher.
              {user && " Vos événements (créés ou publiés) apparaîtront ici."}
            </p>
            <ButtonLink href="/events" variant="secondary">
              Voir tous les événements
            </ButtonLink>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev, i) => (
              <Link key={ev.id} href={`/events/${ev.id}`} className="block animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                <div className="relative flex flex-col min-h-[180px] rounded-xl border border-[var(--card-border)] overflow-hidden transition-base hover:border-[var(--card-border-hover)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
                  {ev.imageUrl ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${ev.imageUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                      <div className="relative z-10 flex flex-col justify-end p-5 text-white">
                        <h3 className="text-lg font-semibold mb-2 drop-shadow-md tracking-tight">{ev.title}</h3>
                        <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-medium bg-white/20 backdrop-blur-sm w-fit mb-2">
                          {ev.type === "online" ? "En ligne" : "En présentiel"}
                        </span>
                        <p className="text-white/90 text-sm">{eventDateStr(ev)}</p>
                        <p className="text-white/80 text-sm">{eventLocation(ev)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col flex-1 p-6 bg-[var(--card)] border-0 rounded-xl">
                      <h3 className="heading-3 mb-3">{ev.title}</h3>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium w-fit mb-2 ${
                          ev.type === "online"
                            ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                            : "bg-[var(--card-border)] text-[var(--muted)]"
                        }`}
                      >
                        {ev.type === "online" ? "En ligne" : "En présentiel"}
                      </span>
                      <p className="caption mb-1">{eventDateStr(ev)}</p>
                      <p className="caption">{eventLocation(ev)}</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Gyms */}
      <section className="mt-20 sm:mt-24">
        <h2 className="heading-2 mb-2">Clubs & Salles</h2>
        <p className="caption mb-8">
          Centres d&apos;entraînement près de vous
        </p>
        {loadingGyms ? (
          <p className="caption">Chargement…</p>
        ) : gyms.length === 0 ? (
          <p className="caption">Aucun club pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gyms.map((gym, i) => (
              <Link key={gym.id} href={`/gyms/${gym.id}`} className="block animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                <div className="relative flex flex-col min-h-[160px] rounded-xl border border-[var(--card-border)] overflow-hidden transition-base hover:border-[var(--card-border-hover)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
                  {gym.imageUrl ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${gym.imageUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                      <div className="relative z-10 flex flex-col justify-end p-5 text-white">
                        <h3 className="text-lg font-semibold drop-shadow-md tracking-tight">{gym.name}</h3>
                        <p className="text-white/90 text-sm mt-1">
                          {[gym.city, gym.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <Card className="flex flex-col flex-1 border-0 rounded-none min-h-[140px] hover:bg-[var(--card-hover)]">
                      <h3 className="heading-3 mb-2">{gym.name}</h3>
                      <p className="caption">
                        {[gym.city, gym.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </Card>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
