"use client";

import { useState } from "react";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { listBenchmarks, createBenchmark } from "@/lib/db";
import { getSeedBenchmarks } from "@/lib/seedBenchmarksData";
import { useToast } from "@/contexts/ToastContext";

/**
 * Organizer-only page: import official benchmarks (Girls, Hero, 1RM) idempotently.
 * Dedup by nameLower + category.
 */
function SeedBenchmarksContent() {
  const { addToast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    setResult(null);
    const seedItems = getSeedBenchmarks();
    let created = 0;
    let skipped = 0;

    try {
      for (const item of seedItems) {
        const { items } = await listBenchmarks({
          search: item.nameLower,
          category: item.category,
          pageSize: 10,
        });
        const exists = items.some(
          (b) => b.nameLower === item.nameLower && b.category === item.category
        );
        if (exists) {
          skipped += 1;
          continue;
        }
        await createBenchmark({
          name: item.name,
          nameLower: item.nameLower,
          category: item.category,
          scoreType: item.scoreType,
          timeCapSeconds: item.timeCapSeconds ?? null,
          descriptionRx: item.descriptionRx ?? null,
          descriptionScaled: item.descriptionScaled ?? null,
          defaultTrack: item.defaultTrack,
          movements: item.movements ?? null,
          source: "seed",
        });
        created += 1;
      }
      setResult({ created, skipped });
      addToast(`${created} benchmark(s) créé(s), ${skipped} déjà existant(s).`);
    } catch (err) {
      console.error("[Seed benchmarks]", err);
      const msg = err instanceof Error ? err.message : String(err);
      const isPermissionDenied =
        msg.includes("permission") || msg.includes("Permission") || msg.includes("insufficient");
      addToast(
        isPermissionDenied
          ? "Droits refusés : votre compte doit avoir le rôle Organisateur (Firestore: users/{uid}.roles.organizer = true)."
          : msg || "Erreur lors de l'import.",
        "error"
      );
    } finally {
      setSeeding(false);
    }
  }

  const seedCount = getSeedBenchmarks().length;

  return (
    <Layout>
      <Link href="/organizer" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Dashboard organisateur
      </Link>
      <h1 className="heading-1 mb-4">Importer les benchmarks officiels</h1>
      <Card className="mb-6">
        <p className="text-[var(--muted)] mb-4">
          Importe les benchmarks officiels (Girls, Hero, 1RM) dans la base. Les doublons sont ignorés
          (même nom + même catégorie).
        </p>
        <p className="text-sm text-[var(--muted)] mb-4">
          {seedCount} entrées : 14 Girls, exemples Hero, 11 1RM (Back Squat, Deadlift, Snatch, etc.).
        </p>
        <Button onClick={handleSeed} disabled={seeding}>
          {seeding ? "Import en cours…" : "Importer les benchmarks"}
        </Button>
      </Card>
      {result && (
        <Card>
          <p className="text-[var(--foreground)]">
            Créés : <strong>{result.created}</strong> · Déjà présents : <strong>{result.skipped}</strong>
          </p>
        </Card>
      )}
    </Layout>
  );
}

export default function SeedBenchmarksPage() {
  return (
    <OrganizerRoute>
      <SeedBenchmarksContent />
    </OrganizerRoute>
  );
}
