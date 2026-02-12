"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InstallPWAPrompt } from "@/components/InstallPWAPrompt";
import { getUser } from "@/lib/db";
import { type ReactNode } from "react";

/**
 * App shell: nav + main. Nav shows auth state and role-based links. Mobile-friendly.
 */
export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUser>>>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    getUser(user.uid).then(setProfile);
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`
          text-sm font-medium transition-base py-2 rounded-lg px-3 -mx-1
          ${active ? "text-[var(--accent)] bg-[var(--accent-muted)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"}
        `}
      >
        {label}
      </Link>
    );
  };

  const navContent = (
    <>
      {navLink("/", "Home")}
      {navLink("/events", "Events")}
      {navLink("/dashboard", "Dashboard")}
      {!loading && (
        <>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-1 transition-base hover:bg-[var(--card)]"
                title={profile?.displayName ?? user.email ?? ""}
              >
                <Avatar
                  photoURL={profile?.photoURL}
                  displayName={profile?.displayName ?? user.email}
                  firstName={profile?.firstName}
                  lastName={profile?.lastName}
                  size="sm"
                />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              {navLink("/auth/login", "Log in")}
              <ButtonLink href="/auth/signup" variant="primary" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/80 w-full">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <Logo variant="nav" />
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">{navContent}</nav>
          {/* Mobile: hamburger + dropdown */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link href="/dashboard" className="shrink-0">
                <Avatar
                  photoURL={profile?.photoURL}
                  displayName={profile?.displayName ?? user.email}
                  firstName={profile?.firstName}
                  lastName={profile?.lastName}
                  size="sm"
                />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] transition-base focus-ring"
              aria-expanded={mobileOpen}
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--card-border)] bg-[var(--card)] px-3 sm:px-4 py-3 sm:py-4 animate-fade-in">
            <nav className="flex flex-col gap-1">{navContent}</nav>
          </div>
        )}
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10">{children}</main>
      <InstallPWAPrompt />
    </div>
  );
}
