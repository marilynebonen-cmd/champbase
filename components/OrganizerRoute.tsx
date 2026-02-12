"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUser } from "@/lib/firestore/users";

/**
 * Protects organizer-only routes: requires auth + organizer role.
 * Judges are organizers for now (no separate judge role).
 */
export function OrganizerRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) router.replace("/auth/login");
      return;
    }
    let cancelled = false;
    getUser(user.uid).then((profile) => {
      if (cancelled) return;
      const isOrganizer = profile?.roles?.organizer ?? false;
      setAllowed(isOrganizer);
      if (!isOrganizer) router.replace("/dashboard/athlete");
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || !user || allowed === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
