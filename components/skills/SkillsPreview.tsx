"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getUserSkillStates,
  setUserSkillState,
  getSkillCategoryVisibility,
  setSkillCategoryVisibility,
} from "@/lib/db";
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
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [dialogCategory, setDialogCategory] = useState<SkillCategory | null>(null);

  const previewCategories = SKILL_PREVIEW_CATEGORY_IDS.map((id) =>
    getCategoryById(id)
  ).filter((c): c is SkillCategory => c != null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserSkillStates(user.uid).then(setSkillStates);
    getSkillCategoryVisibility(user.uid, SKILL_PREVIEW_CATEGORY_IDS).then(setVisibility);
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

  const handleVisibilityChange = (categoryId: string, isPublic: boolean) => {
    if (!user?.uid) return;
    setVisibility((prev) => ({ ...prev, [categoryId]: isPublic }));
    setSkillCategoryVisibility(user.uid, categoryId, isPublic)
      .then(() =>
        addToast(isPublic ? "Compétence visible." : "Compétence masquée.")
      )
      .catch(() => {
        addToast("Erreur", "error");
        setVisibility((prev) => ({ ...prev, [categoryId]: !isPublic }));
      });
  };

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
        <div className="grid grid-cols-2 gap-4">
          {previewCategories.map((cat) => {
            const movements = getMovementsByCategory(cat.id);
            const acquired = movements.filter((m) => skillStates[m.id]).length;
            const total = movements.length;
            const percent = total > 0 ? Math.round((acquired / total) * 100) : 0;
            const isPublic = visibility[cat.id] !== false;
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col min-h-[7.5rem]"
              >
                <div
                  className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                  onClick={() => setDialogCategory(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setDialogCategory(cat)}
                  aria-label={`Ouvrir la checklist ${cat.name}`}
                >
                  <span className="text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]">
                    {cat.name}
                  </span>
                  <span className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogCategory(cat)}
                  className="flex items-center gap-3 mt-auto text-left w-full rounded-lg hover:opacity-90 transition-opacity"
                  aria-label={`Ouvrir la checklist ${cat.name}`}
                >
                  <ProgressRing percent={percent} size={44} strokeWidth={4} />
                  <span className="text-xl font-semibold text-[var(--foreground)]">
                    {acquired}/{total}
                  </span>
                </button>
                <label
                  className="flex items-center gap-2 mt-3 text-sm text-[var(--muted)] cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => handleVisibilityChange(cat.id, e.target.checked)}
                    className="rounded border-[var(--card-border)] accent-[var(--accent)]"
                    aria-label={`Rendre cette compétence ${isPublic ? "privée" : "publique"}`}
                  />
                  <span>Public</span>
                </label>
              </div>
            );
          })}
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
