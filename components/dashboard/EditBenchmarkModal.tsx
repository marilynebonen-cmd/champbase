"use client";

import { useState, useEffect, useRef } from "react";

type EditBenchmarkModalProps = {
  title: string;
  value: string;
  unit?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
};

export function EditBenchmarkModal({
  title,
  value,
  unit = "kg",
  onSave,
  onCancel,
}: EditBenchmarkModalProps) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
    inputRef.current?.focus();
  }, [value]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(inputValue.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-benchmark-title"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-benchmark-title" className="text-lg font-semibold mb-4">
          {title}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="benchmark-value" className="block text-sm font-medium text-[var(--muted)] mb-1">
              Valeur ({unit})
            </label>
            <input
              id="benchmark-value"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="—"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-hover)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
