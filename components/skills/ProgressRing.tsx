"use client";

type ProgressRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
};

export function ProgressRing({
  percent,
  size = 44,
  strokeWidth = 4,
  className = "",
  showLabel = true,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--foreground)]"
          aria-hidden
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
