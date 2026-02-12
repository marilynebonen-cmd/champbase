"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getWod,
  getWodScore,
  setWodScore,
  getWodLeaderboardByTrack,
  getMyRank,
  getUser,
  getUsersByIds,
} from "@/lib/db";
import type { WodLeaderboardTrack } from "@/lib/db";
import { parseWodValue, formatWodValue, SCORING_TYPE_LABELS, getWodDisplayDescription } from "@/lib/wodScoreUtils";
import { uploadScorePhoto } from "@/lib/storage";
import { setGymFeedDoc } from "@/lib/firestore/gymFeed";
import { AthleteName } from "@/components/AthleteName";
import type { WodWithId, WodDivision, WodScoreType, WodDefaultTrack } from "@/types";
import type { WodScoreWithId } from "@/types";
import type { UserProfile } from "@/types";

const DIVISIONS: { value: WodDivision; label: string }[] = [
  { value: "men_rx", label: "Hommes RX" },
  { value: "men_scaled", label: "Hommes Scaled" },
  { value: "women_rx", label: "Femmes RX" },
  { value: "women_scaled", label: "Femmes Scaled" },
];

const PAGE_SIZE = 20;

function WodDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const wodId = params.wodId as string;
  const gymId = searchParams.get("gymId") ?? "";
  const { user } = useAuth();
  const { addToast } = useToast();

  const [wod, setWod] = useState<WodWithId | null>(null);
  const [myScore, setMyScore] = useState<WodScoreWithId | null>(null);
  const [leaderboard, setLeaderboard] = useState<WodScoreWithId[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [leaderboardTrack, setLeaderboardTrack] = useState<WodLeaderboardTrack>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingLb, setLoadingLb] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [athletesMap, setAthletesMap] = useState<Map<string, UserProfile>>(new Map());

  // Score form
  const [scoreInput, setScoreInput] = useState("");
  const [formDivision, setFormDivision] = useState<WodDivision>("men_rx");
  const [completedWithinTimeCap, setCompletedWithinTimeCap] = useState(true);
  const [caption, setCaption] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descriptionTrack, setDescriptionTrack] = useState<WodDefaultTrack>("rx");

  const isWeightWod = wod?.scoreType === "weight";
  const LEADERBOARD_FILTERS: { value: WodLeaderboardTrack; label: string }[] = isWeightWod
    ? [{ value: "all", label: "TOUS" }, { value: "men", label: "Homme" }, { value: "women", label: "Femme" }]
    : [{ value: "all", label: "TOUS" }, { value: "rx", label: "RX" }, { value: "scaled", label: "SCALE" }];
  const effectiveTrack: WodLeaderboardTrack =
    isWeightWod && (leaderboardTrack === "rx" || leaderboardTrack === "scaled")
      ? "all"
      : !isWeightWod && (leaderboardTrack === "men" || leaderboardTrack === "women")
        ? "all"
        : leaderboardTrack;

  useEffect(() => {
    if (!gymId || !wodId) return;
    getWod(gymId, wodId)
      .then(setWod)
      .catch(() => setWod(null))
      .finally(() => setLoading(false));
  }, [gymId, wodId]);

  useEffect(() => {
    if (!gymId || !wodId || !user) return;
    getWodScore(gymId, wodId, user.uid)
      .then(setMyScore)
      .catch(() => setMyScore(null));
  }, [gymId, wodId, user]);

  useEffect(() => {
    if (!gymId || !wodId || !wod) return;
    setLoadingLb(true);
    getWodLeaderboardByTrack(gymId, wodId, effectiveTrack, wod.scoreType, limit)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLb(false));
  }, [gymId, wodId, wod, effectiveTrack, limit]);

  useEffect(() => {
    if (leaderboard.length === 0) {
      setAthletesMap(new Map());
      return;
    }
    const uids = [...new Set(leaderboard.map((r) => r.uid))];
    getUsersByIds(uids).then(setAthletesMap);
  }, [leaderboard]);

  useEffect(() => {
    if (!gymId || !wodId || !wod || !myScore) return;
    getMyRank(gymId, wodId, myScore.division, wod.scoreType, {
      uid: myScore.uid,
      value: myScore.value,
      completedWithinTimeCap: myScore.completedWithinTimeCap,
    })
      .then(setMyRank)
      .catch(() => setMyRank(null));
  }, [gymId, wodId, wod, myScore]);

  const divisionLabel = (d: WodDivision) => DIVISIONS.find((x) => x.value === d)?.label ?? d;

  useEffect(() => {
    if (wod) setDescriptionTrack(wod.defaultTrack ?? "rx");
  }, [wod?.defaultTrack]);

  useEffect(() => {
    if (myScore) {
      const isTimeCapWod = wod?.scoreType === "reps" || wod?.scoreType === "time";
      const completedForDisplay = myScore.completedWithinTimeCap === true || (wod?.scoreType === "time" && myScore.completedWithinTimeCap === undefined);
      const effectiveType: WodScoreType =
        isTimeCapWod && completedForDisplay ? "time" : isTimeCapWod ? "reps" : (wod?.scoreType ?? "reps");
      setScoreInput(formatWodValue(effectiveType, myScore.value, myScore.valueRaw) || "");
      setFormDivision(myScore.division);
      setCompletedWithinTimeCap(isTimeCapWod ? completedForDisplay : true);
      setCaption(myScore.caption ?? "");
      if (myScore.photoUrl) setPhotoPreviewUrl(myScore.photoUrl);
      setPhotoRemoved(false);
    }
  }, [myScore, wod?.scoreType]);

  // Vider le champ de score quand l'utilisateur change la case "WOD complété avant TC"
  useEffect(() => {
    if (!wod || !myScore) return;
    const isTimeCapWod = wod.scoreType === "reps" || wod.scoreType === "time";
    if (!isTimeCapWod) return;
    // Quand la case change, on vide le champ pour que l'utilisateur ressaisisse dans le bon format
    setScoreInput("");
  }, [completedWithinTimeCap]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Veuillez choisir une image (JPEG, PNG ou WebP).");
      return;
    }
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreviewUrl && photoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoRemoved(true);
  }

  async function handleSubmitScore(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user || !wod || !gymId) return;
    const effectiveScoreType: WodScoreType =
      (wod.scoreType === "reps" || wod.scoreType === "time") ? (completedWithinTimeCap ? "time" : "reps") : wod.scoreType;
    const result = parseWodValue(effectiveScoreType, scoreInput);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSubmitting(true);
    try {
      const profile = await getUser(user.uid);
      const firstName = profile?.firstName ?? "";
      const lastName = profile?.lastName ?? "";
      const displayName =
        [firstName, lastName].filter(Boolean).join(" ") ||
        profile?.displayName ||
        user.displayName ||
        user.email ||
        "Athlète";

      let photoStoragePath: string | undefined;
      let photoUrl: string | undefined;
      if (photoFile) {
        const uploaded = await uploadScorePhoto(gymId, wodId, user.uid, photoFile);
        photoStoragePath = uploaded.storagePath;
        photoUrl = uploaded.downloadUrl;
      } else if (myScore?.photoUrl && !photoPreviewUrl) {
        // User cleared photo; we don't delete from Storage here, just clear fields
        photoStoragePath = undefined;
        photoUrl = undefined;
      } else if (myScore?.photoUrl) {
        photoUrl = myScore.photoUrl;
        photoStoragePath = myScore.photoStoragePath;
      }

      await setWodScore(gymId, wodId, user.uid, {
        displayName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        division: formDivision,
        value: result.value,
        valueRaw: result.valueRaw,
        completedWithinTimeCap: (wod.scoreType === "reps" || wod.scoreType === "time") ? completedWithinTimeCap : undefined,
        caption: caption.trim() || undefined,
        photoStoragePath,
        photoUrl,
      });
      // Alimenter le fil d'activité du gym pour ce WOD
      const feedScoreId = `${wodId}_${user.uid}`;
      try {
        await setGymFeedDoc(gymId, feedScoreId, {
          gymId,
          workoutId: wodId,
          scoreId: feedScoreId,
          athleteUid: user.uid,
          athleteName: displayName,
          athletePhotoUrl: profile?.photoURL ?? undefined,
          division: formDivision,
          scoreType: wod.scoreType,
          scoreValue: formatWodValue(effectiveScoreType, result.value, result.valueRaw),
          comment: caption.trim() || undefined,
          photoUrl: photoUrl ?? undefined,
          workoutName: wod.title,
        });
      } catch (feedErr) {
        console.warn("[WOD FEED]", feedErr);
      }
      addToast("Score enregistré.");
      setMyScore({
        id: user.uid,
        uid: user.uid,
        displayName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        division: formDivision,
        value: result.value,
        valueRaw: result.valueRaw,
        completedWithinTimeCap: (wod.scoreType === "reps" || wod.scoreType === "time") ? completedWithinTimeCap : undefined,
        caption: caption.trim() || undefined,
        photoStoragePath,
        photoUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setPhotoFile(null);
      setPhotoRemoved(false);
      if (photoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(photoUrl ?? null);
      getWodLeaderboardByTrack(gymId, wodId, effectiveTrack, wod.scoreType, limit)
        .then(setLeaderboard)
        .catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !wod) {
    return (
      <Layout>
        {!gymId && <p className="text-red-400">Paramètre gymId manquant.</p>}
        {gymId && <p className="text-[var(--muted)]">Chargement…</p>}
      </Layout>
    );
  }

  const order: "asc" | "desc" = wod.scoreType === "time" ? "asc" : "desc";
  const hasTimeCapOption = wod.scoreType === "reps" || wod.scoreType === "time";
  const scoreAsTime = hasTimeCapOption && completedWithinTimeCap;
  const unitLabel = scoreAsTime ? "mm:ss" : wod.scoreType === "weight" ? "lbs" : "reps";
  const hasRxOrScaled =
    (wod.descriptionRx ?? wod.description) || wod.descriptionScaled;

  return (
    <Layout>
      <Link href="/athlete/wods" className="text-[var(--accent)] mb-4 inline-block hover:underline text-sm sm:text-base">
        ← WODs
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{wod.title}</h1>
      <p className="text-[var(--muted)] text-xs sm:text-sm mb-3">
        Créé le {wod.createdAt instanceof Date
          ? wod.createdAt.toLocaleString("fr-CA", { dateStyle: "medium" })
          : "seconds" in (wod.createdAt as object)
            ? new Date((wod.createdAt as { seconds: number }).seconds * 1000).toLocaleString("fr-CA", { dateStyle: "medium" })
            : new Date().toLocaleString("fr-CA", { dateStyle: "medium" })}
      </p>
      {hasRxOrScaled && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDescriptionTrack("rx")}
              className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                descriptionTrack === "rx"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              RX
            </button>
            <button
              type="button"
              onClick={() => setDescriptionTrack("scaled")}
              className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                descriptionTrack === "scaled"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Scaled
            </button>
          </div>
          <p className="text-[var(--muted)] text-sm whitespace-pre-wrap">{getWodDisplayDescription(wod, descriptionTrack)}</p>
        </div>
      )}
      <span className="inline-block rounded px-2 py-0.5 bg-[var(--card)] text-xs sm:text-sm text-[var(--muted)] mb-6">
        {SCORING_TYPE_LABELS[wod.scoreType]}
      </span>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-1">Soumettre / modifier mon score</h2>
          <p className="text-[var(--muted)] text-xs sm:text-sm mb-4 sm:mb-5">Un seul score par WOD (mise à jour possible).</p>
          <form onSubmit={handleSubmitScore} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1.5">Division</label>
              <select
                value={formDivision}
                onChange={(e) => setFormDivision(e.target.value as WodDivision)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] transition-shadow"
              >
                {DIVISIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {hasTimeCapOption && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 sm:px-4 py-2.5 sm:py-3">
                <input
                  type="checkbox"
                  id="completedWithinTimeCap"
                  checked={completedWithinTimeCap}
                  onChange={(e) => {
                    setCompletedWithinTimeCap(e.target.checked);
                    setScoreInput("");
                  }}
                  className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4 sm:w-5 sm:h-5"
                />
                <label htmlFor="completedWithinTimeCap" className="text-xs sm:text-sm font-medium text-[var(--foreground)] cursor-pointer">
                  WOD complété avant TC
                </label>
              </div>
            )}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1.5">Score ({unitLabel}) *</label>
              <input
                type="text"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder={scoreAsTime ? "5:30" : wod.scoreType === "weight" ? "225" : "120"}
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1.5">Commentaire / post (optionnel)</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Commentaire ou post pour le fil d'activité…"
                rows={2}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--foreground)] text-sm resize-y placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1.5">Photo (optionnel)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="block w-full text-xs sm:text-sm text-[var(--muted)] file:mr-2 sm:file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-3 sm:file:px-4 file:py-1.5 sm:file:py-2 file:text-xs sm:file:text-sm file:font-semibold file:text-black file:cursor-pointer hover:file:opacity-90 transition-opacity"
              />
              {(photoPreviewUrl || photoFile) && (
                <div className="mt-2 flex items-start gap-3">
                  {photoPreviewUrl && (
                    <img
                      src={photoPreviewUrl}
                      alt="Aperçu"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-[var(--card-border)] flex-shrink-0"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="text-xs sm:text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline mt-1"
                  >
                    Retirer la photo
                  </button>
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-xs sm:text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] text-black px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? "Envoi…" : "Soumettre"}
            </button>
          </form>
          {myScore && (
            <p className="text-[var(--muted)] text-xs sm:text-sm mt-3 sm:mt-4 pt-3 border-t border-[var(--card-border)]">
              Mon score : <span className="font-medium text-[var(--foreground)]">
                {formatWodValue(
                  (wod.scoreType === "reps" || wod.scoreType === "time") && myScore.completedWithinTimeCap === true ? "time" : wod.scoreType,
                  myScore.value,
                  myScore.valueRaw
                )}
                {wod.scoreType === "weight" && <span className="text-xs sm:text-sm text-[var(--muted)]"> lbs</span>}
              </span>
              {myRank != null && <span className="ml-1">— Rang : <span className="font-semibold text-[var(--accent)]">#{myRank}</span></span>}
            </p>
          )}
          {gymId && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--card-border)]">
              <Link
                href={`/gyms/${gymId}?tab=feed`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/70 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Voir le fil d&apos;activité du club
              </Link>
            </div>
          )}
        </Card>

        <Card className="rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-2">Leaderboard</h2>
          <p className="text-[var(--muted)] text-xs sm:text-sm mb-3">Tous les scores, du meilleur au moins bon. Choisissez TOUS, RX ou SCALE.</p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
            {LEADERBOARD_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setLeaderboardTrack(f.value)}
                className={`rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                  effectiveTrack === f.value
                    ? "bg-[var(--accent)] text-black shadow-sm"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {loadingLb && <p className="text-[var(--muted)] text-sm py-4">Chargement…</p>}
          {!loadingLb && leaderboard.length === 0 && (
            <p className="text-[var(--muted)] text-sm py-4">
              {effectiveTrack === "all" ? "Aucun score pour ce WOD." : isWeightWod ? `Aucun score (${effectiveTrack === "men" ? "Homme" : "Femme"}).` : `Aucun score en ${effectiveTrack === "rx" ? "RX" : "SCALE"}.`}
            </p>
          )}
          {!loadingLb && leaderboard.length > 0 && (
            <>
              <div className="rounded-xl border border-[var(--card-border)] overflow-hidden overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/50">
                      <th className="text-left py-3 px-3 font-semibold text-[var(--muted)]">#</th>
                      <th className="text-left py-3 px-3 font-semibold text-[var(--muted)]">Athlète</th>
                      <th className="text-left py-3 px-3 font-semibold text-[var(--muted)]">Division</th>
                      <th className="text-right py-3 px-3 font-semibold text-[var(--muted)]">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => (
                      <tr key={row.id} className="border-b border-[var(--card-border)]/50 last:border-0 hover:bg-[var(--card)]/50 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <AthleteName athleteId={row.uid} athletesMap={athletesMap} />
                        </td>
                        <td className="py-2.5 px-3 text-[var(--muted)] text-xs">
                          {divisionLabel(row.division)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {formatWodValue(
                            (wod.scoreType === "reps" || wod.scoreType === "time") && row.completedWithinTimeCap === true ? "time" : wod.scoreType,
                            row.value,
                            row.valueRaw
                          )}
                          {wod.scoreType === "weight" && <span className="text-sm text-[var(--muted)]"> lbs</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="mt-3 text-sm font-medium text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] rounded"
              >
                Charger plus
              </button>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default function WodDetailPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Layout><p className="text-[var(--muted)]">Chargement…</p></Layout>}>
        <WodDetailContent />
      </Suspense>
    </ProtectedRoute>
  );
}
