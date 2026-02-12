"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { SkillsGrid } from "@/components/skills/SkillsGrid";

export default function DashboardSkillsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="container max-w-6xl mx-auto py-6 px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Retour au dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">Toutes les compétences</h1>
          </div>
          <SkillsGrid />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
