"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getBenchmark,
  listBenchmarkResultsForUser,
  addBenchmarkResult,
  updateBenchmarkResult,
  deleteBenchmarkResult,
} from "@/lib/db";
import { getBestResult, formatResultValue, formatTimeSeconds } from "@/lib/benchmarkResultUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { BenchmarkDescriptionDialog } from "@/components/benchmarks/BenchmarkDescriptionDialog";
import { BenchmarkResultFormModal } from "@/components/benchmarks/BenchmarkResultFormModal";
import type {
  BenchmarkWithId,
  BenchmarkResultWithId,
  BenchmarkCategory,
  BenchmarkScoreType,
} from "@/types";

const CATEGORY_LABELS: Record<BenchmarkCategory, string> = {
  girls: "Girls",
  hero: "Hero",
  "1rm": "1RM",
  open: "Open",
  custom: "Autres",
};

const SCORE_TYPE_LABELS: Record<BenchmarkScoreType, string> = {
  time: "For time",
  reps: "AMRAP",
  weight: "1RM",
  time_or_reps: "Time / Reps",
  custom: "Custom",
};

export default function BenchmarkDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [benchmark, setBenchmark] = useState<BenchmarkWithId | null>(null);
  const [results, setResults] = useState<BenchmarkResultWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [editingResult, setEditingResult] = useState<BenchmarkResultWithId | null>(null);

  const fetchBenchmark = useCallback(async () => {
    if (!id) return;
    const b = await getBenchmark(id);
    setBenchmark(b ?? null);
  }, [id]);

  const fetchResults = useCallback(async () => {
    if (!id || !user?.uid) return;
    const list = await listBenchmarkResultsForUser(user.uid, id);
    setResults(list);
  }, [id, user?.uid]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBenchmark(id)
      .then((b) => {
        setBenchmark(b ?? null);
        if (user?.uid && b) {
          return listBenchmarkResultsForUser(user.uid, id).then(setResults);
        }
        setResults([]);
      })
      .catch(() => setBenchmark(null))
      .finally(() => setLoading(false));
  }, [id, user?.uid]);

  const refreshResults = useCallback(() => {
    if (user?.uid && id) listBenchmarkResultsForUser(user.uid, id).then(setResults);
  }, [user?.uid, id]);

  const handleSaveResult = useCallback(
    async (
      data: {
        track: BenchmarkResultWithId["track"];
        scoreType: BenchmarkScoreType;
        timeSeconds?: number | null;
        reps?: number | null;
        weight?: number | null;
        unit?: BenchmarkResultWithId["unit"];
        completedWithinTimeCap?: boolean | null;
        performedAt: Date;
        note?: string | null;
      },
      resultId?: string
    ) => {
      if (!user?.uid || !benchmark) return;
      if (resultId) {
        await updateBenchmarkResult(user.uid, resultId, data);
        addToast("Résultat mis à jour.");
      } else {
        await addBenchmarkResult(user.uid, {
          ...data,
          benchmarkId: benchmark.id,
        });
        addToast("Résultat enregistré.");
      }
      setShowResultForm(false);
      setEditingResult(null);
      refreshResults();
    },
    [user?.uid, benchmark, addToast, refreshResults]
  );

  const handleDeleteResult = useCallback(
    async (resultId: string) => {
      if (!user?.uid) return;
      if (!confirm("Supprimer ce résultat ?")) return;
      try {
        await deleteBenchmarkResult(user.uid, resultId);
        addToast("Résultat supprimé.");
        refreshResults();
      } catch (e) {
        addToast("Erreur lors de la suppression.", "error");
      }
    },
    [user?.uid, addToast, refreshResults]
  );

  const pr = benchmark ? getBestResult(results, benchmark.scoreType) : null;

  if (loading || !benchmark) {
    return (
      <Layout>
        <Link href="/benchmarks" className="text-[var(--accent)] mb-4 inline-block hover:underline">
          ← Tous les benchmarks
        </Link>
        {loading ? (
          <p className="text-[var(--muted)]">Chargement…</p>
        ) : (
          <p className="text-[var(--muted)]">Benchmark introuvable.</p>
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href="/benchmarks" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Tous les benchmarks
      </Link>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="heading-1">{benchmark.name}</h1>
        <span className="rounded-full bg-[var(--card)] border border-[var(--card-border)] px-3 py-1 text-sm text-[var(--muted)]">
          {CATEGORY_LABELS[benchmark.category]}
        </span>
        <span className="rounded-full bg-[var(--card)] border border-[var(--card-border)] px-3 py-1 text-sm text-[var(--muted)]">
          {SCORE_TYPE_LABELS[benchmark.scoreType]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setShowDesc(true)}>
          Voir description
        </Button>
        {user && (
          <Button
            size="sm"
            onClick={() => {
              setEditingResult(null);
              setShowResultForm(true);
            }}
          >
            Entrer un résultat
          </Button>
        )}
      </div>

      {user && (
        <>
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Mon meilleur résultat (PR)</h2>
            {pr ? (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[var(--foreground)]">
                      {formatResultValue(pr, benchmark.scoreType)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {pr.performedAt instanceof Date
                        ? pr.performedAt.toLocaleDateString()
                        : new Date((pr.performedAt as { seconds: number }).seconds * 1000).toLocaleDateString()}
                      {pr.track && ` · ${pr.track.toUpperCase()}`}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-[var(--muted)]">Aucun résultat enregistré.</p>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Historique</h2>
            {results.length === 0 ? (
              <Card>
                <p className="text-[var(--muted)]">Aucun résultat.</p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.id}>
                    <Card className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <span className="font-medium">
                          {formatResultValue(r, benchmark.scoreType)}
                        </span>
                        <span className="text-sm text-[var(--muted)] ml-2">
                          {r.performedAt instanceof Date
                            ? r.performedAt.toLocaleDateString()
                            : new Date((r.performedAt as { seconds: number }).seconds * 1000).toLocaleDateString()}
                          {benchmark.scoreType !== "weight" && r.track && ` · ${r.track.toUpperCase()}`}
                        </span>
                        {r.note && (
                          <p className="text-sm text-[var(--muted)] mt-0.5">{r.note}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingResult(r);
                            setShowResultForm(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteResult(r.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {!user && (
        <Card>
          <p className="text-[var(--muted)]">
            Connectez-vous pour enregistrer vos résultats et voir votre historique.
          </p>
        </Card>
      )}

      {showDesc && (
        <BenchmarkDescriptionDialog
          benchmark={benchmark}
          onClose={() => setShowDesc(false)}
        />
      )}

      {showResultForm && (
        <BenchmarkResultFormModal
          benchmark={benchmark}
          existingResult={editingResult}
          onSave={() => {}}
          onCancel={() => {
            setShowResultForm(false);
            setEditingResult(null);
          }}
          onSubmit={handleSaveResult}
        />
      )}
    </Layout>
  );
}
