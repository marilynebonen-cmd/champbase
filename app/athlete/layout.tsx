"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Layout espace athlète : sous-navigation pour les pages athlète (sans liens organisateur).
 */
export default function AthleteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={
        pathname === href
          ? "text-[var(--accent)] font-semibold"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }
    >
      {label}
    </Link>
  );

  return (
    <>
      <nav
        className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-[var(--card-border)]"
        aria-label="Espace athlète"
      >
        {navLink("/athlete", "Espace athlète")}
        {navLink("/events", "Événements")}
        {navLink("/scores/submit", "Soumettre un score")}
        {navLink("/leaderboards", "Classements")}
        {navLink("/athlete/wods", "WODs par gym")}
      </nav>
      {children}
    </>
  );
}
