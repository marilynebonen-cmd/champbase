"use client";

import { type ReactNode } from "react";

/**
 * SaaS-style card: subtle border, hover lift, consistent padding from design scale.
 */
export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  /** Enable hover lift + border glow */
  hover?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-base",
        "shadow-sm",
        hover &&
          "hover:border-[var(--card-border-hover)] hover:bg-[var(--card-hover)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
