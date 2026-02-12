"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getUserSkillStates, setUserSkillState } from "@/lib/db";
import { SKILL_CATEGORIES, getMovementsByCategory } from "@/lib/skillsCatalog";
import type { SkillCategory } from "@/lib/skillsCatalog";
import { ProgressRing } from "./ProgressRing";
import { SkillDialog } from "./SkillDialog";
import { useEffect } from "react";

export function SkillsGrid() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [skillStates, setSkillStates] = useState<Record<string, boolean>>({});
  const [dialogCategory, setDialogCategory] = useState<SkillCategory | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    getUserSkillStates(user.uid).then(setSkillStates);
  }, [user?.uid]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SKILL_CATEGORIES;
    return SKILL_CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

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

  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une compétence…"
          className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredCategories.map((cat) => {
          const movements = getMovementsByCategory(cat.id);
          const acquired = movements.filter((m) => skillStates[m.id]).length;
          const total = movements.length;
          const percent = total > 0 ? Math.round((acquired / total) * 100) : 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setDialogCategory(cat)}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col items-center gap-3 hover:bg-[var(--card-hover)] transition-colors text-center"
            >
              <ProgressRing percent={percent} size={48} strokeWidth={4} />
              <span className="text-sm font-medium text-[var(--foreground)] line-clamp-2">
                {cat.name}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {acquired}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <p className="text-sm text-[var(--muted)] py-8">Aucune compétence trouvée.</p>
      )}

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
