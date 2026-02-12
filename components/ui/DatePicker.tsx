"use client";

import { useState, useRef, useEffect } from "react";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromYMD(ymd: string): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
};

export function DatePicker({ value, onChange, placeholder = "Choisir une date", id, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const v = fromYMD(value);
    return v ?? new Date();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = fromYMD(value);
    if (v) setViewDate(v);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function selectDay(day: number) {
    const d = new Date(year, month, day);
    onChange(toYMD(d));
    setOpen(false);
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const displayLabel = value ? (() => {
    const d = fromYMD(value);
    if (!d) return value;
    return d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  })() : placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-left text-[var(--foreground)] flex items-center justify-between gap-2"
      >
        <span className={value ? "" : "text-[var(--muted)]"}>{displayLabel}</span>
        <span className="text-[var(--muted)]" aria-hidden>📅</span>
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-lg min-w-[280px]"
          role="dialog"
          aria-label="Calendrier"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label="Mois précédent"
            >
              ←
            </button>
            <span className="font-semibold text-sm">
              {MOIS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label="Mois suivant"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {JOURS.map((j) => (
              <div key={j} className="py-1 text-[var(--muted)] font-medium">
                {j}
              </div>
            ))}
            {days.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day === null ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`w-8 h-8 rounded-full text-sm ${
                      value === toYMD(new Date(year, month, day))
                        ? "bg-[var(--accent)] text-black font-semibold"
                        : "text-[var(--foreground)] hover:bg-[var(--background)]"
                    }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
