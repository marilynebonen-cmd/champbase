"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { listBenchmarks, listBenchmarkResultsForUser, getUser } from "@/lib/db";
import { getBestResult, formatResultValue } from "@/lib/benchmarkResultUtils";
import { useAuth } from "@/contexts/AuthContext";
import type { BenchmarkWithId, BenchmarkCategory } from "@/types";
import { BENCHMARK_CATEGORIES } from "@/types";
import { BenchmarkDescriptionDialog } from "@/components/benchmarks/BenchmarkDescriptionDialog";

const CATEGORY_LABELS: Record<BenchmarkCategory, string> = {
  girls: "Girls",
  hero: "Hero",
  "1rm": "1RM",
  open: "Open",
  custom: "Autres",
};

const SCORE_TYPE_LABELS: Record<string, string> = {
  time: "For time",
  reps: "AMRAP",
  weight: "1RM",
  time_or_reps: "Time / Reps",
  custom: "Custom",
};

const PAGE_SIZE = 24;

export default function BenchmarksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BenchmarkWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [category, setCategory] = useState<BenchmarkCategory | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [descBenchmark, setDescBenchmark] = useState<BenchmarkWithId | null>(null);
  const [profile, setProfile] = useState<{ roles?: { organizer?: boolean } } | null>(null);
  const [resultsByBenchmarkId, setResultsByBenchmarkId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.uid) return;
    getUser(user.uid).then(setProfile).catch(() => setProfile(null));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || items.length === 0) {
      setResultsByBenchmarkId({});
      return;
    }
    let cancelled = false;
    Promise.all(
      items.map(async (b) => {
        const results = await listBenchmarkResultsForUser(user.uid!, b.id);
        const pr = getBestResult(results, b.scoreType);
        const formatted = pr ? formatResultValue(pr, b.scoreType) : "—";
        return { id: b.id, formatted } as const;
      })
    )
      .then((pairs) => {
        if (cancelled) return;
        setResultsByBenchmarkId(
          pairs.reduce<Record<string, string>>((acc, { id, formatted }) => ({ ...acc, [id]: formatted }), {})
        );
      })
      .catch(() => {
        if (!cancelled) setResultsByBenchmarkId({});
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, items]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!append) setLoading(true);
      try {
        const res = await listBenchmarks({
          search: searchDebounced || undefined,
          category,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setNextPage(res.nextPage);
      } catch (e) {
        console.error("[benchmarks list]", e);
        if (!append) setItems([]);
        setNextPage(null);
      } finally {
        setLoading(false);
      }
    },
    [searchDebounced, category]
  );

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [searchDebounced, category]);

  useEffect(() => {
    fetchList(page, page > 1);
  }, [page, searchDebounced, category, fetchList]);

  const loadMore = useCallback(() => {
    if (nextPage !== null) setPage((p) => p + 1);
  }, [nextPage]);

  return (
    <Layout>
      <Link
        href="/dashboard/athlete"
        className="text-[var(--accent)] mb-4 inline-block hover:underline"
      >
        ← Dashboard athlète
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="heading-1">Benchmarks</h1>
        {profile?.roles?.organizer && (
          <Link
            href="/organizer/benchmarks/seed"
            className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Importer les benchmarks officiels
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Rechercher par nom…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory(undefined);
              setPage(1);
            }}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              category === undefined
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] hover:border-[var(--card-border-hover)]",
            ].join(" ")}
          >
            Tous
          </button>
          {BENCHMARK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                category === cat
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] hover:border-[var(--card-border-hover)]",
              ].join(" ")}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--muted)] py-8">Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-[var(--muted)]">
            Aucun benchmark trouvé. Modifiez la recherche ou les filtres.
          </p>
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <li key={b.id}>
                <Card hover className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">{b.name}</h3>
                      <p className="text-sm text-[var(--muted)]">
                        {CATEGORY_LABELS[b.category]} · {SCORE_TYPE_LABELS[b.scoreType] ?? b.scoreType}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-[var(--foreground)] min-h-[1.5rem]">
                    {resultsByBenchmarkId[b.id] ?? "—"}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDescBenchmark(b)}
                    >
                      Voir description
                    </Button>
                    <Link href={`/benchmarks/${b.id}`}>
                      <Button variant="outline" size="sm">
                        Voir
                      </Button>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {nextPage !== null && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setPage(nextPage)}
              >
                Voir plus
              </Button>
            </div>
          )}
        </>
      )}

      {descBenchmark && (
        <BenchmarkDescriptionDialog
          benchmark={descBenchmark}
          onClose={() => setDescBenchmark(null)}
        />
      )}
    </Layout>
  );
}
