"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import type { SkillCategory, SkillMovement } from "@/lib/skillsCatalog";
import { getMovementsByCategory } from "@/lib/skillsCatalog";

type SkillDialogProps = {
  open: boolean;
  onClose: () => void;
  category: SkillCategory;
  skillStates: Record<string, boolean>;
  onToggle: (movementId: string, acquired: boolean) => void | Promise<void>;
};

export function SkillDialog({
  open,
  onClose,
  category,
  skillStates,
  onToggle,
}: SkillDialogProps) {
  const [search, setSearch] = useState("");
  const movements = useMemo(
    () => getMovementsByCategory(category.id),
    [category.id]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => m.name.toLowerCase().includes(q));
  }, [movements, search]);

  const acquiredCount = useMemo(
    () => movements.filter((m) => skillStates[m.id]).length,
    [movements, skillStates]
  );
  const total = movements.length;
  const percent = total > 0 ? Math.round((acquiredCount / total) * 100) : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--card-border)]">
          <h2 id="skill-dialog-title" className="text-lg font-semibold truncate">
            Compétence : {category.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-[var(--card-border)]">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {acquiredCount}/{total} ({percent}%)
          </p>
        </div>

        <div className="p-4 border-b border-[var(--card-border)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un mouvement…"
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <ul className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
          {filtered.map((m) => (
            <MovementRow
              key={m.id}
              movement={m}
              acquired={!!skillStates[m.id]}
              onToggle={(acquired) => onToggle(m.id, acquired)}
            />
          ))}
          {filtered.length === 0 && (
            <li className="text-sm text-[var(--muted)] py-4">Aucun mouvement trouvé.</li>
          )}
        </ul>

        <div className="p-4 border-t border-[var(--card-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

function MovementRow({
  movement,
  acquired,
  onToggle,
}: {
  movement: SkillMovement;
  acquired: boolean;
  onToggle: (acquired: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleChange() {
    setLoading(true);
    try {
      await onToggle(!acquired);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
      <input
        type="checkbox"
        id={`skill-${movement.id}`}
        checked={acquired}
        onChange={handleChange}
        disabled={loading}
        className="rounded border-[var(--card-border)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]"
        aria-label={`${movement.name} ${acquired ? "acquis" : "non acquis"}`}
      />
      <label
        htmlFor={`skill-${movement.id}`}
        className="flex-1 text-sm text-[var(--foreground)] cursor-pointer select-none"
      >
        {movement.name}
      </label>
    </li>
  );
}
