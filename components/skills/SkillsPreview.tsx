"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getUserSkillStates, setUserSkillState } from "@/lib/db";
import {
  SKILL_PREVIEW_CATEGORY_IDS,
  getCategoryById,
  getMovementsByCategory,
} from "@/lib/skillsCatalog";
import type { SkillCategory } from "@/lib/skillsCatalog";
import { ProgressRing } from "./ProgressRing";
import { SkillDialog } from "./SkillDialog";

export function SkillsPreview() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [skillStates, setSkillStates] = useState<Record<string, boolean>>({});
  const [dialogCategory, setDialogCategory] = useState<SkillCategory | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserSkillStates(user.uid).then(setSkillStates);
  }, [user?.uid]);

  const handleToggle = async (movementId: string, acquired: boolean) => {
    if (!user?.uid) return;
    try {
      await setUserSkillState(user.uid, movementId, acquired);
      setSkillStates((prev) => ({ ...prev, [movementId]: acquired }));
      addToast("Enregistré.");
    } catch {
      addToast("Erreur lors de l'enregistrement.", "error");
    }
  };

  const previewCategories = SKILL_PREVIEW_CATEGORY_IDS.map((id) =>
    getCategoryById(id)
  ).filter((c): c is SkillCategory => c != null);

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold">Compétences</h2>
          <Link
            href="/dashboard/skills"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Voir toutes les compétences
          </Link>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 min-w-0 sm:min-w-none">
            {previewCategories.map((cat) => {
              const movements = getMovementsByCategory(cat.id);
              const acquired = movements.filter((m) => skillStates[m.id]).length;
              const total = movements.length;
              const percent = total > 0 ? Math.round((acquired / total) * 100) : 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setDialogCategory(cat)}
                  className="shrink-0 w-[calc(50%-0.5rem)] sm:w-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center gap-4 hover:bg-[var(--card-hover)] transition-colors text-left"
                >
                  <ProgressRing percent={percent} size={44} strokeWidth={4} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-[var(--foreground)] block truncate">
                      {cat.name}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {acquired}/{total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {dialogCategory && (
        <SkillDialog
          open={true}
          onClose={() => setDialogCategory(null)}
          category={dialogCategory}
          skillStates={skillStates}
          onToggle={handleToggle}
        />
      )}
    </>
  );
}
