"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUser,
  getGym,
  getRegistrationsByUser,
  getEvent,
} from "@/lib/db";
import type { UserProfile } from "@/types";
import type { EventWithId } from "@/types";
import type { EventRegistrationWithId } from "@/types";
import { BenchmarkCard } from "./BenchmarkCard";
import { EditBenchmarkModal } from "./EditBenchmarkModal";
import { SkillCard } from "./SkillCard";

const BENCHMARK_IDS = [
  { id: "backSquat", label: "1RM Back Squat" },
  { id: "benchPress", label: "1RM Bench Press" },
  { id: "cleanJerk", label: "1RM Clean & Jerk" },
  { id: "deadlift", label: "1RM Deadlift" },
  { id: "frontSquat", label: "1RM Front Squat" },
  { id: "hangPowerClean", label: "1RM Hang Power Clean" },
] as const;

type BenchmarkId = (typeof BENCHMARK_IDS)[number]["id"];

const PLACEHOLDER_SKILLS = [
  { title: "Compétence 1", level: 60 },
  { title: "Compétence 2", level: 40 },
  { title: "Compétence 3", level: 80 },
  { title: "Compétence 4", level: 25 },
];

/**
 * Athlete dashboard: left profile sidebar + main area (leaderboard, events, benchmarks, skills).
 * Rendered inside Layout. Organizer pill at bottom of sidebar.
 */
export function AthleteDashboardView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationWithId[]>([]);
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<BenchmarkId, string>>({
    backSquat: "",
    benchPress: "",
    cleanJerk: "",
    deadlift: "",
    frontSquat: "",
    hangPowerClean: "",
  });
  const [editingBenchmark, setEditingBenchmark] = useState<BenchmarkId | null>(null);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then(setProfile);
  }, [user]);

  useEffect(() => {
    if (!profile?.affiliatedGymId) {
      setClubName(null);
      return;
    }
    getGym(profile.affiliatedGymId).then((g) =>
      setClubName(g ? g.name : null)
    );
  }, [profile?.affiliatedGymId]);

  useEffect(() => {
    if (!user) return;
    getRegistrationsByUser(user.uid)
      .then((result) => {
        setRegistrations(result.registrations);
        return Promise.all(
          result.registrations.map((r) => getEvent(r.eventId))
        ).then((evs) =>
          setEvents(evs.filter((e): e is EventWithId => e !== null))
        );
      })
      .catch(() => {
        setRegistrations([]);
      });
  }, [user]);

  function handleBenchmarkSave(id: BenchmarkId, value: string) {
    setBenchmarks((prev) => ({ ...prev, [id]: value }));
    setEditingBenchmark(null);
  }

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.displayName ||
    user?.email ||
    "—";

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left sidebar: profile card + Organizer pill */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          <Card className="flex flex-col items-center text-center lg:items-center lg:text-center">
            <Link href="/profile" className="block mt-1">
              <Avatar
                photoURL={profile?.photoURL}
                displayName={profile?.displayName}
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                size="lg"
              />
            </Link>
            <h2 className="text-lg font-semibold mt-3 text-[var(--foreground)]">
              {displayName}
            </h2>
            <Link
              href="/profile"
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Modifier le profil
            </Link>
            <dl className="mt-4 w-full space-y-2 text-left">
              <div className="flex justify-between gap-2">
                <dt className="text-sm text-[var(--muted)]">Division</dt>
                <dd className="text-sm font-medium">{profile?.preferredDivision ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-sm text-[var(--muted)]">Club affilié</dt>
                <dd className="text-sm font-medium truncate">{clubName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-sm text-[var(--muted)]">Team</dt>
                <dd className="text-sm font-medium">—</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-sm text-[var(--muted)]">Région</dt>
                <dd className="text-sm font-medium">—</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-sm text-[var(--muted)]">Citoyenneté</dt>
                <dd className="text-sm font-medium">—</dd>
              </div>
            </dl>
            <div className="mt-6 pt-4 border-t border-[var(--card-border)] w-full">
              <Link
                href="/dashboard/organizer"
                className="inline-flex items-center justify-center w-full rounded-full bg-[var(--accent)]/15 border-2 border-[var(--accent)] text-[var(--accent)] py-2.5 px-4 text-sm font-semibold hover:bg-[var(--accent)]/25 transition-colors"
              >
                Organizer
              </Link>
            </div>
          </Card>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Leaderboard de mon gym */}
          <section>
            <h2 className="text-xl font-bold mb-3">Leaderboard de mon gym</h2>
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-medium text-[var(--foreground)]">
                {clubName ?? (profile?.affiliatedGymId ? "Mon club" : "Aucun club affilié")}
              </p>
              {profile?.affiliatedGymId ? (
                <ButtonLink
                  href={`/gyms/${profile.affiliatedGymId}?tab=leaderboard`}
                  size="md"
                >
                  Leaderboard du jour
                </ButtonLink>
              ) : (
                <Link
                  href="/profile"
                  className="rounded-xl bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  Associer un club
                </Link>
              )}
            </Card>
          </section>

          {/* Événements auxquels je suis inscrit */}
          <section>
            <h2 className="text-xl font-bold mb-3">Événements auxquels je suis inscrit</h2>
            <Card>
              {registrations.length === 0 ? (
                <p className="text-[var(--muted)] text-sm">
                  Aucune inscription pour le moment. Inscris-toi à un événement depuis la page{" "}
                  <Link href="/events" className="text-[var(--accent)] hover:underline">
                    Événements
                  </Link>
                  .
                </p>
              ) : (
                <ul className="space-y-3">
                  {registrations.map((reg) => {
                    const ev = events.find((e) => e.id === reg.eventId);
                    return (
                      <li
                        key={reg.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--background)]"
                      >
                        <div>
                          <span className="font-semibold">{ev?.title ?? "Événement"}</span>
                          <span className="text-[var(--muted)] text-sm ml-2">· {reg.division}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/events/${reg.eventId}`}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            Voir le leaderboard
                          </Link>
                          <Link
                            href={`/leaderboards?eventId=${reg.eventId}&submit=1`}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            Soumettre un score
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>

          {/* Benchmarks */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xl font-bold">Benchmarks</h2>
              <Link
                href="/benchmarks"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Voir tous les benchmarks
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BENCHMARK_IDS.map(({ id, label }) => (
                <BenchmarkCard
                  key={id}
                  title={label}
                  value={benchmarks[id]}
                  onEdit={() => setEditingBenchmark(id)}
                />
              ))}
            </div>
          </section>

          {/* Compétences */}
          <section>
            <h2 className="text-xl font-bold mb-3">Compétences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLACEHOLDER_SKILLS.map((skill, i) => (
                <SkillCard
                  key={i}
                  title={skill.title}
                  level={skill.level}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Edit benchmark modal */}
      {editingBenchmark && (
        <EditBenchmarkModal
          title={BENCHMARK_IDS.find((b) => b.id === editingBenchmark)!.label}
          value={benchmarks[editingBenchmark]}
          unit="kg"
          onSave={(value) => handleBenchmarkSave(editingBenchmark, value)}
          onCancel={() => setEditingBenchmark(null)}
        />
      )}
    </>
  );
}
