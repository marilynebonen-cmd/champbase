"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { getGym, getUser, listPublicBenchmarkResultsForUser, getBenchmark, getMemberRoleInGym, setGymMemberRole } from "@/lib/db";
import { formatResultValue } from "@/lib/benchmarkResultUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { UserProfile } from "@/types";
import { getDivisionLabel } from "@/types";
import type { GymWithId } from "@/types";
import type { BenchmarkResultWithId } from "@/types";
import type { BenchmarkWithId } from "@/types";

/**
 * Profil public d'un membre du gym.
 * Affiche le rôle (Admin/Coach) depuis Firestore ; le propriétaire du gym peut modifier le niveau de permission.
 * Affiche uniquement les benchmarks isPublic === true.
 */
export default function GymMemberProfilePage() {
  const params = useParams();
  const gymId = params.gymId as string;
  const userId = params.userId as string;
  const { user } = useAuth();
  const { addToast } = useToast();
  const [gym, setGym] = useState<GymWithId | null>(null);
  const [member, setMember] = useState<UserProfile | null>(null);
  const [publicResults, setPublicResults] = useState<BenchmarkResultWithId[]>([]);
  const [benchmarksById, setBenchmarksById] = useState<Record<string, BenchmarkWithId>>({});
  const [memberRole, setMemberRole] = useState<{ admin: boolean; coach: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!gymId || !userId) return;
    let cancelled = false;
    Promise.all([getGym(gymId), getUser(userId)])
      .then(([g, u]) => {
        if (cancelled) return;
        setGym(g ?? null);
        setMember(u ?? null);
        if (!u) {
          setForbidden(true);
          return;
        }
        if (u.affiliatedGymId !== gymId) {
          setForbidden(true);
          return;
        }
        getMemberRoleInGym(gymId, userId).then((role) => {
          if (!cancelled) setMemberRole(role);
        }).catch(() => { if (!cancelled) setMemberRole({ admin: false, coach: false }); });
        return listPublicBenchmarkResultsForUser(userId);
      })
      .then((results) => {
        if (cancelled || results === undefined) return;
        setPublicResults(results);
        const ids = [...new Set(results.map((r) => r.benchmarkId))];
        return Promise.all(ids.map((id) => getBenchmark(id)));
      })
      .then((benchList) => {
        if (cancelled || !benchList) return;
        const map: Record<string, BenchmarkWithId> = {};
        benchList.forEach((b) => {
          if (b) map[b.id] = b;
        });
        setBenchmarksById(map);
      })
      .catch(() => {
        if (!cancelled) setForbidden(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gymId, userId]);

  const displayName =
    member
      ? [member.firstName, member.lastName].filter(Boolean).join(" ") || member.displayName || "—"
      : "—";

  const isOwner = Boolean(user && gym && gym.ownerUid === user.uid);
  const isMemberOwner = Boolean(gym && gym.ownerUid === userId);
  const canEditRole = isOwner && !isMemberOwner;

  async function handleMemberRoleChange(role: "admin" | "coach", value: boolean) {
    if (!gymId || !userId || !canEditRole || !memberRole) return;
    setUpdatingRole(true);
    const prev = { ...memberRole };
    const next = role === "admin" ? { ...memberRole, admin: value } : { ...memberRole, coach: value };
    setMemberRole(next);
    try {
      await setGymMemberRole(gymId, userId, role, value);
      addToast(value ? `Rôle ${role === "admin" ? "Admin" : "Coach"} attribué.` : "Rôle retiré.");
    } catch {
      addToast("Erreur lors de la mise à jour du rôle.", "error");
      setMemberRole(prev);
    } finally {
      setUpdatingRole(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }

  if (forbidden || !gym || !member) {
    return (
      <Layout>
        <Link href={`/gyms/${gymId}?tab=members`} className="text-[var(--accent)] mb-4 inline-block hover:underline">
          ← Retour aux membres
        </Link>
        <Card>
          <p className="text-[var(--muted)]">Profil non accessible.</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href={`/gyms/${gymId}?tab=members`} className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Retour aux membres
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
        <Avatar
          photoURL={member.photoURL}
          displayName={member.displayName}
          firstName={member.firstName}
          lastName={member.lastName}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{displayName}</h1>
          {member.preferredDivision && (
            <p className="text-[var(--muted)] mt-1">{getDivisionLabel(member.preferredDivision)}</p>
          )}
          {memberRole && (memberRole.admin || memberRole.coach) && (
            <p className="mt-2 flex flex-wrap gap-2">
              {memberRole.admin && (
                <span className="inline-flex rounded-lg bg-[var(--accent-muted)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
                  Admin du gym
                </span>
              )}
              {memberRole.coach && (
                <span className="inline-flex rounded-lg bg-[var(--accent-muted)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
                  Coach
                </span>
              )}
            </p>
          )}
          {canEditRole && memberRole && (
            <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex flex-wrap items-center gap-4">
              <span className="text-sm text-[var(--muted)]">Niveau de permission :</span>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberRole.admin}
                  onChange={(e) => handleMemberRoleChange("admin", e.target.checked)}
                  disabled={updatingRole}
                  className="rounded border-[var(--card-border)] accent-[var(--accent)]"
                />
                <span>Admin du gym</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberRole.coach}
                  onChange={(e) => handleMemberRoleChange("coach", e.target.checked)}
                  disabled={updatingRole}
                  className="rounded border-[var(--card-border)] accent-[var(--accent)]"
                />
                <span>Coach</span>
              </label>
              {updatingRole && <span className="text-xs text-[var(--muted)]">Mise à jour…</span>}
            </div>
          )}
        </div>
      </div>

      {member.benchmarksPublic !== false && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Benchmarks</h2>
          {publicResults.length === 0 ? (
            <Card>
              <p className="text-[var(--muted)]">Aucun benchmark public.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {publicResults.map((r) => {
                const bench = benchmarksById[r.benchmarkId];
                const scoreType = bench?.scoreType ?? "custom";
                const name = bench?.name ?? r.benchmarkId;
                const performedAt =
                  r.performedAt instanceof Date
                    ? r.performedAt
                    : new Date((r.performedAt as { seconds: number }).seconds * 1000);
                return (
                  <li key={r.id}>
                    <Card className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <span className="font-medium">{name}</span>
                        <span className="text-sm text-[var(--muted)] ml-2">
                          {performedAt.toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatResultValue(r, scoreType)}
                      </span>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {member.benchmarksPublic === false && (
        <section>
          <Card>
            <p className="text-[var(--muted)]">Les benchmarks ne sont pas partagés par ce membre.</p>
          </Card>
        </section>
      )}

      {member.skillsPublic !== false && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Compétences</h2>
          <Card>
            <p className="text-[var(--muted)]">Aucune compétence partagée pour le moment.</p>
          </Card>
        </section>
      )}

      {member.skillsPublic === false && (
        <section>
          <Card>
            <p className="text-[var(--muted)]">Les compétences ne sont pas partagées par ce membre.</p>
          </Card>
        </section>
      )}
    </Layout>
  );
}
