"use client";

type BenchmarkCardProps = {
  title: string;
  value: string;
  onEdit: () => void;
};

export function BenchmarkCard({ title, value, onEdit }: BenchmarkCardProps) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-[var(--muted)]">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors"
          aria-label={`Modifier ${title}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
      <p className="text-xl font-semibold text-[var(--foreground)] mt-auto">
        {value || "—"}
      </p>
    </div>
  );
}
