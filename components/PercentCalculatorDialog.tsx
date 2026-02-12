"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { UserWeightBenchmark } from "@/lib/getUserWeightBenchmarks";
import { useToast } from "@/contexts/ToastContext";

const ROUND_OPTIONS = [
  { value: 0.5, label: "0.5 (plaques)" },
  { value: 1, label: "1" },
  { value: 2.5, label: "2.5" },
  { value: 5, label: "5" },
] as const;

function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const r = Math.round(value / step) * step;
  return Math.round(r * 10) / 10;
}

type PercentCalculatorDialogProps = {
  open: boolean;
  onClose: () => void;
  items: UserWeightBenchmark[];
  loading?: boolean;
};

export function PercentCalculatorDialog({
  open,
  onClose,
  items,
  loading = false,
}: PercentCalculatorDialogProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserWeightBenchmark | null>(null);
  const [percent, setPercent] = useState<string>("");
  const [roundTo, setRoundTo] = useState<number>(0.5);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items
      .filter(
        (i) =>
          i.benchmarkName.toLowerCase().includes(q) ||
          i.benchmarkId.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [items, search]);

  const percentNum = useMemo(() => {
    const n = parseFloat(percent.replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 200) return null;
    return n;
  }, [percent]);

  const result = useMemo(() => {
    if (!selected || percentNum == null) return null;
    const raw = (selected.value * percentNum) / 100;
    return roundToStep(raw, roundTo);
  }, [selected, percentNum, roundTo]);

  const summary = useMemo(() => {
    if (!selected || result == null) return null;
    const p = percentNum ?? 0;
    return `${p}% de ${selected.benchmarkName} (1RM ${selected.value} ${selected.unit}) = ${result} ${selected.unit}`;
  }, [selected, result, percentNum]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(null);
      setPercent("");
      setRoundTo(0.5);
      setDropdownOpen(false);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      addToast("Résultat copié.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="percent-calc-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--card-border)]">
          <h2 id="percent-calc-title" className="text-lg font-semibold">
            Calculatrice %
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

        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          {loading ? (
            <p className="text-[var(--muted)] text-sm">Chargement de tes benchmarks…</p>
          ) : items.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">
              Aucun benchmark poids (1RM) enregistré. Enregistre au moins un 1RM pour utiliser la calculatrice.
            </p>
          ) : (
            <>
              <div ref={dropdownRef} className="relative">
                <label htmlFor="percent-calc-search" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
                  Rechercher un benchmark
                </label>
                <input
                  id="percent-calc-search"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setDropdownOpen(true);
                    if (!e.target.value) setSelected(null);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Ex: Back Squat, Deadlift…"
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                {dropdownOpen && filtered.length > 0 && (
                  <ul
                    className="absolute z-10 w-full mt-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] shadow-lg max-h-48 overflow-y-auto"
                    role="listbox"
                  >
                    {filtered.map((item) => (
                      <li
                        key={item.benchmarkId}
                        role="option"
                        aria-selected={selected?.benchmarkId === item.benchmarkId}
                        className="px-4 py-3 cursor-pointer hover:bg-[var(--card-hover)] border-b border-[var(--card-border)] last:border-b-0"
                        onClick={() => {
                          setSelected(item);
                          setSearch(item.benchmarkName);
                          setDropdownOpen(false);
                        }}
                      >
                        <span className="font-medium">{item.benchmarkName}</span>
                        <span className="text-[var(--muted)] text-sm ml-2">
                          {item.value} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected && (
                <div className="rounded-lg bg-[var(--card-hover)]/50 p-3 text-sm">
                  <span className="text-[var(--muted)]">1RM : </span>
                  <span className="font-semibold">{selected.benchmarkName}</span>
                  <span className="text-[var(--foreground)]"> — {selected.value} {selected.unit}</span>
                </div>
              )}

              <div>
                <label htmlFor="percent-calc-pct" className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
                  % (0 à 200)
                </label>
                <input
                  id="percent-calc-pct"
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="Ex: 50, 72.5"
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                  Arrondi
                </span>
                <div className="flex flex-wrap gap-2">
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoundTo(opt.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        roundTo === opt.value
                          ? "bg-[var(--accent)] text-black"
                          : "bg-[var(--card-hover)] text-[var(--foreground)] hover:bg-[var(--card-border)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {result != null && selected && (
                <div className="rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-muted)]/20 p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {result} {selected.unit}
                  </p>
                  {summary && (
                    <p className="text-sm text-[var(--muted)] mt-2">{summary}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 p-4 border-t border-[var(--card-border)]">
          {summary && (
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              Copier
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
