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
  listBenchmarks,
  listBenchmarkResultsForUser,
  getUserWeightBenchmarks,
  updateBenchmarkVisibility,
  getGymRolesForUser,
} from "@/lib/db";
import { getBestResult, formatResultValue } from "@/lib/benchmarkResultUtils";
import type { UserProfile } from "@/types";
import { getDivisionLabel } from "@/types";
import type { EventWithId } from "@/types";
import type { EventRegistrationWithId } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { BenchmarkCard } from "./BenchmarkCard";
import { SkillsPreview } from "@/components/skills/SkillsPreview";
import { PercentCalculatorDialog } from "@/components/PercentCalculatorDialog";

/** Preview des benchmarks affichés sur le dashboard (label + nameLower pour matcher Firestore). */
const BENCHMARK_PREVIEW_NAMES = [
  { label: "1RM Back Squat", nameLower: "back squat" },
  { label: "1RM Bench Press", nameLower: "bench press" },
  { label: "1RM Clean & Jerk", nameLower: "clean & jerk" },
  { label: "1RM Deadlift", nameLower: "deadlift" },
  { label: "1RM Front Squat", nameLower: "front squat" },
  { label: "1RM Snatch", nameLower: "snatch" },
] as const;

export type BenchmarkPreviewItem = {
  label: string;
  benchmarkId: string | null;
  formattedValue: string;
  resultId: string | null;
  isPublic: boolean;
};

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
  const [benchmarkPreviews, setBenchmarkPreviews] = useState<BenchmarkPreviewItem[]>(
    BENCHMARK_PREVIEW_NAMES.map(({ label }) => ({
      label,
      benchmarkId: null,
      formattedValue: "—",
      resultId: null,
      isPublic: true,
    }))
  );
  const [isMobile, setIsMobile] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [weightBenchmarksForCalc, setWeightBenchmarksForCalc] = useState<Awaited<ReturnType<typeof getUserWeightBenchmarks>>>([]);
  const [weightBenchmarksLoading, setWeightBenchmarksLoading] = useState(false);
  const [gymRoles, setGymRoles] = useState<Awaited<ReturnType<typeof getGymRolesForUser>>>([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then(setProfile);
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    getGymRolesForUser(user.uid).then(setGymRoles).catch(() => setGymRoles([]));
  }, [user?.uid]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /** Charge les résultats des benchmarks 1RM pour l’aperçu dashboard (même format que page benchmarks). */
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    listBenchmarks({ category: "1rm", pageSize: 50 })
      .then((res) => {
        if (cancelled) return;
        const benchList = res.items;
        return Promise.all(
          BENCHMARK_PREVIEW_NAMES.map(async ({ label, nameLower }) => {
            const bench = benchList.find((b) => b.nameLower === nameLower) ?? null;
            if (!bench) {
              return { label, benchmarkId: null, formattedValue: "—", resultId: null, isPublic: true };
            }
            const results = await listBenchmarkResultsForUser(user.uid, bench.id);
            const pr = getBestResult(results, bench.scoreType);
            const formattedValue = pr
              ? formatResultValue(pr, bench.scoreType)
              : "—";
            return {
              label,
              benchmarkId: bench.id,
              formattedValue,
              resultId: pr?.id ?? null,
              isPublic: pr?.isPublic !== false,
            };
          })
        );
      })
      .then((previews) => {
        if (!cancelled && Array.isArray(previews)) setBenchmarkPreviews(previews);
      })
      .catch(() => {
        if (!cancelled) {
          setBenchmarkPreviews(
            BENCHMARK_PREVIEW_NAMES.map(({ label }) => ({
              label,
              benchmarkId: null,
              formattedValue: "—",
              resultId: null,
              isPublic: true,
            }))
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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
    if (!calculatorOpen || !user?.uid) return;
    setWeightBenchmarksLoading(true);
    getUserWeightBenchmarks(user.uid)
      .then(setWeightBenchmarksForCalc)
      .catch(() => setWeightBenchmarksForCalc([]))
      .finally(() => setWeightBenchmarksLoading(false));
  }, [calculatorOpen, user?.uid]);

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
                <dd className="text-sm font-medium">{getDivisionLabel(profile?.preferredDivision)}</dd>
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
              {gymRoles.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--card-border)]">
                  <dt className="text-sm text-[var(--muted)]">Rôles au gym</dt>
                  {gymRoles.map((r) => {
                    const labels = [];
                    if (r.admin) labels.push("Admin du gym");
                    if (r.coach) labels.push("Coach");
                    const label = labels.join(" & ");
                    return (
                      <dd key={r.gymId} className="text-sm font-medium">
                        <Link href={`/gyms/${r.gymId}`} className="text-[var(--accent)] hover:underline">
                          {label} · {r.gymName}
                        </Link>
                      </dd>
                    );
                  })}
                </div>
              )}
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
              {profile?.affiliatedGymId ? (
                <Link
                  href={`/gyms/${profile.affiliatedGymId}`}
                  className="font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                >
                  {clubName ?? "Mon club"}
                </Link>
              ) : (
                <p className="font-medium text-[var(--foreground)]">
                  Aucun club affilié
                </p>
              )}
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCalculatorOpen(true)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors"
                  aria-label="Calculatrice %"
                  title="Calculatrice %"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="7" cy="7" r="3" />
                    <circle cx="17" cy="17" r="3" />
                    <line x1="4" y1="20" x2="20" y2="4" />
                  </svg>
                </button>
                <Link
                  href="/benchmarks"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  Voir tous les benchmarks
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {benchmarkPreviews.slice(0, 4).map((item) => (
                <div key={item.label} className="min-h-[7.5rem]">
                  <BenchmarkCard
                    title={item.label}
                  value={item.formattedValue}
                  href={item.benchmarkId ? `/benchmarks/${item.benchmarkId}` : undefined}
                  resultId={item.resultId}
                  isPublic={item.isPublic}
                  onVisibilityChange={
                    item.resultId && user?.uid
                      ? (publicChecked) => {
                          const resultId = item.resultId as string;
                          setBenchmarkPreviews((prev) =>
                            prev.map((p) =>
                              p.resultId === resultId ? { ...p, isPublic: publicChecked } : p
                            )
                          );
                          updateBenchmarkVisibility(user.uid, resultId, publicChecked)
                            .then(() =>
                              addToast(publicChecked ? "Benchmark visible par les autres." : "Benchmark masqué.")
                            )
                            .catch(() => {
                              addToast("Erreur", "error");
                              setBenchmarkPreviews((prev) =>
                                prev.map((p) =>
                                  p.resultId === resultId ? { ...p, isPublic: !publicChecked } : p
                                )
                              );
                            });
                        }
                      : undefined
                  }
                />
                </div>
              ))}
            </div>
          </section>

          <SkillsPreview />
        </main>
      </div>

      <PercentCalculatorDialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        items={weightBenchmarksForCalc}
        loading={weightBenchmarksLoading}
      />
    </>
  );
}
