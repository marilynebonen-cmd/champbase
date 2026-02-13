"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canUserAccessOrganizerArea } from "@/lib/db";

/**
 * Protects organizer routes: requires auth + (organizer role or admin/coach d'au moins un gym).
 * Les coachs et admins de gym peuvent créer des WODs sans avoir le rôle organizer global.
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
    canUserAccessOrganizerArea(user.uid).then((canAccess) => {
      if (cancelled) return;
      setAllowed(canAccess);
      if (!canAccess) router.replace("/dashboard/athlete");
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || !user || allowed === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
