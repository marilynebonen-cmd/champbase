"use client";

import Link from "next/link";

/**
 * Prominent link to switch between Athlete and Organizer dashboard.
 */
export function DashboardSwitchLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--accent)]/20 transition-colors mb-6"
    >
      <span aria-hidden>↔</span>
      {label}
    </Link>
  );
}
