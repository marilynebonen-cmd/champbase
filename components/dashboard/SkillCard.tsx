"use client";

type SkillCardProps = {
  title: string;
  /** 0–100 or similar; displayed in circle */
  level?: number;
};

export function SkillCard({ title, level = 0 }: SkillCardProps) {
  const displayLevel = Math.min(100, Math.max(0, level));
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (displayLevel / 100) * circumference;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center gap-4">
      <div className="relative shrink-0 w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--card-border)"
            strokeWidth="4"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset]"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--foreground)]">
          {displayLevel}%
        </span>
      </div>
      <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
    </div>
  );
}
