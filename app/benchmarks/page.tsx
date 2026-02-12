"use client";

import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";

/**
 * Placeholder: full benchmarks list (to be implemented).
 */
export default function BenchmarksPage() {
  return (
    <Layout>
      <Link href="/dashboard/athlete" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Dashboard athlète
      </Link>
      <h1 className="heading-1 mb-4">Benchmarks</h1>
      <Card>
        <p className="text-[var(--muted)]">
          Liste complète des benchmarks à venir. En attendant, modifiez vos benchmarks depuis le dashboard athlète.
        </p>
      </Card>
    </Layout>
  );
}
