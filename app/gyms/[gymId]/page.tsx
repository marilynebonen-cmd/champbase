"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import {
  getGym,
  getGymFromServer,
  getPublishedWodsByGym,
  getUsersByGym,
  subscribeGymMembers,
  subscribeGymFeed,
  getGymFeedPage,
  getScoresByAthlete,
  deleteScore,
  deleteGymFeedDoc,
  updateGymImageUrl,
  updateGym,
  getGymMemberRoles,
  setGymMemberRole,
  getMemberRoleInGym,
} from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ActivityCard } from "@/components/ActivityCard";
import { uploadGymBanner } from "@/lib/storage";
import { resizeImageToBanner } from "@/lib/bannerImage";
import { ImageCropModal } from "@/components/ImageCropModal";
import { getWodDisplayDescription } from "@/lib/wodScoreUtils";
import type { GymWithId } from "@/types";
import type { WodWithId } from "@/types";
import type { UserProfile } from "@/types";
import { getDivisionLabel } from "@/types";
import type { GymFeedDocWithId } from "@/types";
import type { DocumentSnapshot } from "firebase/firestore";

type TabId = "info" | "members" | "leaderboard" | "feed";

const FEED_PAGE_SIZE = 10;

/**
 * Page profil du gym : infos, membres affiliés, WODs et classements.
 */
export default function GymProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gymId = params.gymId as string;
  const [gym, setGym] = useState<GymWithId | null>(null);
  const [wods, setWods] = useState<WodWithId[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabFromUrl && ["info", "members", "leaderboard", "feed"].includes(tabFromUrl) ? tabFromUrl : "feed"
  );

  // Feed state: gyms/{gymId}/feed (created/updated when athlete submits gym daily WOD score)
  const [feedItems, setFeedItems] = useState<GymFeedDocWithId[]>([]);
  const [feedOlderItems, setFeedOlderItems] = useState<GymFeedDocWithId[]>([]);
  const [feedLastVisible, setFeedLastVisible] = useState<DocumentSnapshot | null>(null);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedDeletingMyScores, setFeedDeletingMyScores] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const feedCountLoggedForGym = useRef<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  // État pour l'édition des infos du gym
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    description: "",
    address: "",
    phone: "",
    website: "",
    schedule: "",
    affiliations: "",
    programming: "",
    openingDate: "",
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [memberRoles, setMemberRoles] = useState<Record<string, { admin: boolean; coach: boolean }>>({});
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
  const [currentUserGymRole, setCurrentUserGymRole] = useState<{ admin: boolean; coach: boolean } | null>(null);

  useEffect(() => {
    if (tabFromUrl && ["info", "members", "leaderboard", "feed"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Rôle du user connecté dans ce gym (pour afficher "Créer un WOD" aux coachs/admins)
  useEffect(() => {
    if (!gymId || !gym || !user || gym.ownerUid === user.uid) {
      if (gym?.ownerUid === user?.uid) setCurrentUserGymRole(null);
      return;
    }
    getMemberRoleInGym(gymId, user.uid)
      .then(setCurrentUserGymRole)
      .catch(() => setCurrentUserGymRole({ admin: false, coach: false }));
  }, [gymId, gym, user]);

  // Real-time first page of feed (gyms/{gymId}/feed). Only run when auth is ready AND user is signed in (avoid permission-denied).
  useEffect(() => {
    if (authLoading || !gymId || activeTab !== "feed" || !user) return;
    const unsub = subscribeGymFeed(gymId, FEED_PAGE_SIZE, (items, lastVisible) => {
      setFeedItems(items);
      setFeedLastVisible(lastVisible);
    });
    return () => unsub();
  }, [authLoading, gymId, activeTab, user]);

  // Reset older items when gym or tab changes
  useEffect(() => {
    if (activeTab !== "feed") setFeedOlderItems([]);
  }, [gymId, activeTab]);

  useEffect(() => {
    if (!gymId) return;
    Promise.all([
      getGym(gymId),
      getPublishedWodsByGym(gymId).catch(() => [] as WodWithId[]),
    ])
      .then(([g, w]) => {
        setGym(g ?? null);
        setWods(w);
        if (g) {
          setInfoForm({
            description: g.description ?? "",
            address: g.address ?? "",
            phone: g.phone ?? "",
            website: g.website ?? "",
            schedule: g.schedule ?? "",
            affiliations: g.affiliations ?? "",
            programming: g.programming ?? "",
            openingDate: g.openingDate ?? "",
          });
        }
      })
      .catch((err) => {
        console.error("[Gym profile] load failed:", err);
        setGym(null);
      })
      .finally(() => setLoading(false));
  }, [gymId]);

  // Subscribe to gym members in real-time (requires auth: Firestore users read rule)
  useEffect(() => {
    if (!gymId || !user) return;
    const unsubscribe = subscribeGymMembers(gymId, (members) => {
      setMembers(members);
    });
    return () => unsubscribe();
  }, [gymId, user]);

  // Load member roles when owner views (for members tab)
  useEffect(() => {
    if (!gymId || !gym || !user || gym.ownerUid !== user.uid) return;
    getGymMemberRoles(gymId).then(setMemberRoles).catch(() => setMemberRoles({}));
  }, [gymId, gym, user]);

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }

  if (!gym) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Club introuvable.</p>
        <Link href="/" className="text-[var(--accent)] mt-4 inline-block hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </Layout>
    );
  }

  const location = [gym.city, gym.country].filter(Boolean).join(", ") || null;
  const isOwner = Boolean(user?.uid && gym.ownerUid === user.uid);
  const canCreateWodInGym =
    isOwner || Boolean(currentUserGymRole && (currentUserGymRole.admin || currentUserGymRole.coach));
  const bannerImageUrl = gym.imageUrl && gym.imageUrl.trim() !== "" ? gym.imageUrl.trim() : null;
  const tabs: { id: TabId; label: string }[] = [
    { id: "feed", label: "Fil d'activité" },
    { id: "leaderboard", label: "WODs & Classement" },
    { id: "members", label: "Membres" },
    { id: "info", label: "Infos" },
  ];

  function handleBannerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !gymId || !gym || !user || gym.ownerUid !== user.uid) return;
    if (!file.type.startsWith("image/")) {
      addToast("Choisissez une image (JPEG, PNG ou WebP).", "error");
      return;
    }
    setBannerCropSrc(URL.createObjectURL(file));
  }

  async function handleBannerCropConfirm(croppedFile: File) {
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
    setBannerCropSrc(null);
    if (!gymId || !gym || !user || gym.ownerUid !== user.uid) return;
    setBannerUploading(true);
    const TIMEOUT_MS = 25000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Délai dépassé. Vérifiez votre connexion et réessayez.")), TIMEOUT_MS);
    });
    try {
      let fileToUpload: File;
      try {
        fileToUpload = await Promise.race([
          resizeImageToBanner(croppedFile),
          new Promise<File>((_, rej) => setTimeout(() => rej(new Error("resize_timeout")), 8000)),
        ]);
      } catch {
        fileToUpload = croppedFile;
      }
      const { downloadUrl } = await Promise.race([
        uploadGymBanner(gymId, fileToUpload),
        timeoutPromise,
      ]);
      await Promise.race([
        updateGymImageUrl(gymId, downloadUrl),
        timeoutPromise,
      ]);
      const updated = await Promise.race([
        getGymFromServer(gymId),
        timeoutPromise,
      ]);
      if (updated) setGym(updated);
      addToast("Bannière enregistrée.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Banner upload]", err);
      addToast(msg || "Erreur lors de l’envoi. Vérifiez Storage et les règles Firebase.", "error");
    } finally {
      setBannerUploading(false);
    }
  }

  function handleBannerCropCancel() {
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
    setBannerCropSrc(null);
  }

  function handleEditInfo() {
    if (!gym) return;
    setInfoForm({
      description: gym.description ?? "",
      address: gym.address ?? "",
      phone: gym.phone ?? "",
      website: gym.website ?? "",
      schedule: gym.schedule ?? "",
      affiliations: gym.affiliations ?? "",
      programming: gym.programming ?? "",
      openingDate: gym.openingDate ?? "",
    });
    setEditingInfo(true);
  }

  function handleCancelEditInfo() {
    setEditingInfo(false);
  }

  async function handleMemberRoleChange(
    memberUid: string,
    role: "admin" | "coach",
    value: boolean
  ) {
    if (!gymId || !user || !gym || gym.ownerUid !== user.uid) return;
    setUpdatingRoleFor(memberUid);
    const prev = memberRoles[memberUid] ?? { admin: false, coach: false };
    const next = role === "admin" ? { ...prev, admin: value } : { ...prev, coach: value };
    setMemberRoles((r) => ({ ...r, [memberUid]: next }));
    try {
      await setGymMemberRole(gymId, memberUid, role, value);
      addToast(value ? `Rôle ${role === "admin" ? "Admin" : "Coach"} attribué.` : "Rôle retiré.");
    } catch {
      addToast("Erreur lors de la mise à jour du rôle.", "error");
      setMemberRoles((r) => ({ ...r, [memberUid]: prev }));
    } finally {
      setUpdatingRoleFor(null);
    }
  }

  async function handleSaveInfo() {
    if (!gymId || !user || !gym || gym.ownerUid !== user.uid) return;
    setSavingInfo(true);
    try {
      await updateGym(gymId, infoForm);
      const updated = await getGymFromServer(gymId);
      if (updated) setGym(updated);
      setEditingInfo(false);
      addToast("Informations mises à jour.");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
    } finally {
      setSavingInfo(false);
    }
  }

  return (
    <Layout>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-6"
      >
        <span aria-hidden>←</span>
        Accueil
      </Link>

      {/* Bannière : image lue depuis Firestore (gyms/{gymId}.imageUrl), affichée derrière le nom */}
      <header className="relative w-full rounded-xl md:rounded-2xl overflow-hidden mb-6 md:mb-10 h-[180px] sm:h-[220px] md:h-[280px] flex flex-col justify-end bg-[var(--card)]">
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          aria-label="Choisir une photo de bannière"
          onChange={handleBannerFileSelect}
        />
        {bannerImageUrl ? (
          <>
            <img
              key={bannerImageUrl}
              src={bannerImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, var(--card-border) 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }}
          />
        )}
        {bannerCropSrc && (
          <ImageCropModal
            imageSrc={bannerCropSrc}
            aspect={3}
            fileName="banner.jpg"
            onConfirm={handleBannerCropConfirm}
            onCancel={handleBannerCropCancel}
          />
        )}
        {/* Bouton pour modifier la bannière (propriétaire uniquement) – bien visible sur la bannière */}
        {isOwner && (
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className={
              "absolute top-3 right-3 md:top-4 md:right-4 z-20 inline-flex items-center gap-2 rounded-full px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm font-semibold text-black shadow-xl ring-2 ring-black/20 transition-all " +
              (bannerUploading
                ? "bg-[var(--accent)]/80 opacity-80 cursor-wait"
                : "bg-[var(--accent)] hover:opacity-95 hover:scale-[1.03] cursor-pointer")
            }
            aria-label="Changer la bannière"
          >
            {bannerUploading ? (
              "Envoi…"
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Changer la bannière</span>
                <span className="sm:hidden">Bannière</span>
              </>
            )}
          </button>
        )}
        <div className="relative p-4 sm:p-6 md:p-10 pb-4 sm:pb-6 md:pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3 md:gap-4">
            <div className="max-w-full">
              <h1
                className={`text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-2 ${
                  bannerImageUrl ? "text-white drop-shadow-lg" : "text-[var(--foreground)]"
                }`}
              >
                {gym.name}
              </h1>
              {location && (
                <p
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm ${
                    bannerImageUrl
                      ? "bg-white/15 backdrop-blur-sm border border-white/25 text-white/95"
                      : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]"
                  }`}
                >
                  <span aria-hidden>📍</span>
                  {location}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Onglets – style minimal */}
      <nav
        className="flex flex-wrap gap-2 mb-6 md:mb-10"
        aria-label="Onglets"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold bg-[var(--accent)] text-black"
                : "rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab: Infos – une seule section présentation, sans redondance */}
      {activeTab === "info" && (
        <section className="space-y-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Informations</h2>
            {isOwner && !editingInfo && (
              <button
                type="button"
                onClick={handleEditInfo}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black font-medium hover:opacity-90 transition-opacity"
              >
                Modifier
              </button>
            )}
          </div>

          {editingInfo ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveInfo(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={infoForm.description}
                  onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="Présentation, équipements, ambiance..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Adresse</label>
                  <input
                    type="text"
                    value={infoForm.address}
                    onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="123 rue Example"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="514-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Site web</label>
                  <input
                    type="text"
                    value={infoForm.website}
                    onChange={(e) => setInfoForm({ ...infoForm, website: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="www.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'ouverture</label>
                  <input
                    type="text"
                    value={infoForm.openingDate}
                    onChange={(e) => setInfoForm({ ...infoForm, openingDate: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Janvier 2020"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-2">Horaires</label>
                  <textarea
                    value={infoForm.schedule}
                    onChange={(e) => setInfoForm({ ...infoForm, schedule: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Lun-Ven: 6h-21h&#10;Sam-Dim: 8h-18h"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-2">Affiliations</label>
                  <input
                    type="text"
                    value={infoForm.affiliations}
                    onChange={(e) => setInfoForm({ ...infoForm, affiliations: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="CrossFit, FQH, etc."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-2">Programmation</label>
                  <input
                    type="text"
                    value={infoForm.programming}
                    onChange={(e) => setInfoForm({ ...infoForm, programming: e.target.value })}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="CrossFit, Haltérophilie, Gymnastique..."
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingInfo ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditInfo}
                  disabled={savingInfo}
                  className="px-6 py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--foreground)] font-medium hover:bg-[var(--card)] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              {gym.description && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">À propos</h3>
                  <p className="text-[var(--foreground)] whitespace-pre-line leading-relaxed">{gym.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {gym.address && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Adresse</p>
                    <p className="text-[var(--foreground)]">{gym.address}</p>
                  </div>
                )}
                {gym.phone && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Téléphone</p>
                    <a href={`tel:${gym.phone}`} className="text-[var(--accent)] hover:underline">{gym.phone}</a>
                  </div>
                )}
                {gym.website && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Site web</p>
                    <a
                      href={gym.website.startsWith("http") ? gym.website : `https://${gym.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline break-all"
                    >
                      {gym.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {gym.openingDate && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Date d'ouverture</p>
                    <p className="text-[var(--foreground)]">{gym.openingDate}</p>
                  </div>
                )}
                {gym.affiliations && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Affiliations</p>
                    <p className="text-[var(--foreground)]">{gym.affiliations}</p>
                  </div>
                )}
                {gym.programming && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Programmation</p>
                    <p className="text-[var(--foreground)]">{gym.programming}</p>
                  </div>
                )}
                {gym.schedule && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Horaires</p>
                    <p className="text-[var(--foreground)] whitespace-pre-line">{gym.schedule}</p>
                  </div>
                )}
              </div>
            </>
          )}
          {!editingInfo && (gym.photoUrls?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">Galerie</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gym.photoUrls?.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-[var(--card-border)] aspect-square bg-[var(--card)] hover:border-[var(--accent)]/40 transition-colors"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {!editingInfo && (
            <p className="text-sm text-[var(--muted)] pt-4 border-t border-[var(--card-border)]">
              Rejoignez ce club depuis votre{" "}
              <Link href="/profile" className="text-[var(--accent)] font-medium hover:underline">profil</Link>{" "}
              pour apparaître parmi les membres.
            </p>
          )}
        </section>
      )}

      {/* Tab: Membres */}
      {activeTab === "members" && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">Membres du club</h2>
          {members.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-[var(--muted)] max-w-md mx-auto">
                Aucun membre affilié pour le moment. Les athlètes qui choisissent ce club dans leur
                profil apparaîtront ici.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const roles = memberRoles[member.uid] ?? { admin: false, coach: false };
                const isMemberOwner = gym.ownerUid === member.uid;
                return (
                  <li key={member.uid}>
                    <Card className="flex flex-col gap-3 p-4">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/gyms/${gymId}/members/${member.uid}`}
                          className="flex items-center gap-4 min-w-0 flex-1 hover:opacity-90"
                        >
                          <Avatar
                            photoURL={member.photoURL}
                            displayName={member.displayName}
                            firstName={member.firstName}
                            lastName={member.lastName}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate text-[var(--foreground)]">
                              {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                                member.displayName ||
                                "—"}
                            </p>
                            {member.preferredDivision && (
                              <p className="text-[var(--muted)] text-sm mt-0.5">{getDivisionLabel(member.preferredDivision)}</p>
                            )}
                          </div>
                        </Link>
                        {isMemberOwner && (
                          <span className="shrink-0 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 text-xs font-medium">
                            Propriétaire
                          </span>
                        )}
                      </div>
                      {isOwner && !isMemberOwner && (
                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--card-border)]">
                          <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roles.admin}
                              onChange={(e) => handleMemberRoleChange(member.uid, "admin", e.target.checked)}
                              disabled={updatingRoleFor === member.uid}
                              className="rounded border-[var(--card-border)] accent-[var(--accent)]"
                            />
                            <span>Admin du gym</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roles.coach}
                              onChange={(e) => handleMemberRoleChange(member.uid, "coach", e.target.checked)}
                              disabled={updatingRoleFor === member.uid}
                              className="rounded border-[var(--card-border)] accent-[var(--accent)]"
                            />
                            <span>Coach</span>
                          </label>
                          {updatingRoleFor === member.uid && (
                            <span className="text-xs text-[var(--muted)]">Mise à jour…</span>
                          )}
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Tab: Fil d'activité – liste simple des scores avec le membre */}
      {activeTab === "feed" && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold">Fil d&apos;activité</h2>
          <p className="text-[var(--muted)] text-sm">
            Scores soumis pour les WODs du club (hors événements).
          </p>
          {user && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!user?.uid || feedDeletingMyScores) return;
                  setFeedDeletingMyScores(true);
                  try {
                    const myScores = await getScoresByAthlete(user.uid);
                    for (const s of myScores) {
                      await deleteScore(s.id);
                      if (s.gymId && !(s as { eventId?: string }).eventId) {
                        await deleteGymFeedDoc(s.gymId, s.id);
                      }
                    }
                    addToast(myScores.length > 0 ? `${myScores.length} score(s) supprimé(s).` : "Aucun score à supprimer.");
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
                    addToast(msg, "error");
                  } finally {
                    setFeedDeletingMyScores(false);
                  }
                }}
                disabled={feedDeletingMyScores}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {feedDeletingMyScores ? "Suppression…" : "Supprimer mes scores (test)"}
              </button>
            </div>
          )}
          {[...feedItems, ...feedOlderItems].length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-[var(--muted)] mb-4">Aucun score pour le moment.</p>
              <p className="text-[var(--muted)] text-sm">
                Les scores soumis pour les WODs du club apparaîtront ici.
              </p>
            </Card>
          ) : (
            <>
              <ul className="space-y-5">
                {[...feedItems, ...feedOlderItems].map((item) => (
                  <li key={item.id}>
                    <ActivityCard
                      item={item}
                      gymId={gymId}
                      currentUserId={user?.uid ?? null}
                    />
                  </li>
                ))}
              </ul>
              {feedLastVisible && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!gymId || feedLoadingMore) return;
                      setFeedLoadingMore(true);
                      try {
                        const { items, lastVisible } = await getGymFeedPage(gymId, FEED_PAGE_SIZE, feedLastVisible);
                        setFeedOlderItems((prev) => [...prev, ...items]);
                        setFeedLastVisible(lastVisible);
                      } finally {
                        setFeedLoadingMore(false);
                      }
                    }}
                    disabled={feedLoadingMore}
                    className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] disabled:opacity-50"
                  >
                    {feedLoadingMore ? "Chargement…" : "Charger plus"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Tab: WODs & Classement */}
      {activeTab === "leaderboard" && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">WODs & Classement</h2>
            {canCreateWodInGym && (
              <Link
                href={`/organizer/wods/new?gymId=${gymId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
              >
                <span aria-hidden>+</span>
                Créer un WOD
              </Link>
            )}
          </div>
          {wods.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-[var(--muted)] mb-4">Aucun WOD publié pour ce club.</p>
              <Link
                href="/athlete/wods"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
              >
                Voir les WODs par club
                <span aria-hidden>→</span>
              </Link>
            </Card>
          ) : (
            <ul className="space-y-4">
              {wods.map((wod) => (
                <li key={wod.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-4 p-5 hover:border-[var(--accent)]/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg text-[var(--foreground)]">{wod.title}</h3>
                      {(wod.descriptionRx ?? wod.description ?? wod.descriptionScaled) && (
                        <p className="text-[var(--muted)] text-sm mt-1 line-clamp-2">
                          {getWodDisplayDescription(wod, wod.defaultTrack ?? "rx")}
                        </p>
                      )}
                      <span className="inline-block mt-2 rounded-md px-2.5 py-1 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                        {wod.scoreType === "time" ? "Temps" : wod.scoreType === "reps" ? "Reps" : "Poids"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/athlete/wods/${wod.id}?gymId=${gymId}`}
                        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-black hover:border-[var(--accent)] transition-colors"
                      >
                        Voir le classement
                      </Link>
                      <Link
                        href={`/athlete/wods/${wod.id}?gymId=${gymId}`}
                        className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
                      >
                        Soumettre un score
                      </Link>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Layout>
  );
}
