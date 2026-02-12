/**
 * Charge les benchmarks "poids" (1RM, etc.) de l'utilisateur pour la calculatrice %.
 * Uniquement les résultats avec scoreType "weight" et une valeur numérique.
 */
import { listAllBenchmarkResultsForUser } from "@/lib/firestore/benchmarkResults";
import { getBenchmark } from "@/lib/firestore/benchmarks";
import { getBestResult } from "@/lib/benchmarkResultUtils";
import type { BenchmarkResultUnit } from "@/types";

export type UserWeightBenchmark = {
  benchmarkId: string;
  benchmarkName: string;
  value: number;
  unit: BenchmarkResultUnit;
};

/**
 * Retourne la liste des benchmarks "poids" de l'utilisateur avec leur meilleure valeur (1RM).
 * Utilisé par la calculatrice % (owner only).
 */
export async function getUserWeightBenchmarks(userId: string): Promise<UserWeightBenchmark[]> {
  const results = await listAllBenchmarkResultsForUser(userId);
  const byBenchmark = new Map<string, typeof results>();
  for (const r of results) {
    if (!r.benchmarkId) continue;
    const list = byBenchmark.get(r.benchmarkId) ?? [];
    list.push(r);
    byBenchmark.set(r.benchmarkId, list);
  }

  const out: UserWeightBenchmark[] = [];
  for (const [benchmarkId, group] of byBenchmark) {
    const benchmark = await getBenchmark(benchmarkId);
    if (!benchmark || benchmark.scoreType !== "weight") continue;
    const best = getBestResult(group, "weight");
    if (!best || best.weight == null || best.weight <= 0) continue;
    const unit: BenchmarkResultUnit = (best.unit === "kg" ? "kg" : "lb") as BenchmarkResultUnit;
    out.push({
      benchmarkId,
      benchmarkName: benchmark.name,
      value: Number(best.weight),
      unit,
    });
  }

  out.sort((a, b) => a.benchmarkName.localeCompare(b.benchmarkName));
  return out;
}
