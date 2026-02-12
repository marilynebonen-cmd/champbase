"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getGym, updateGym } from "@/lib/db";
import type { GymWithId } from "@/types";

function EditGymContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const gymId = params.gymId as string;
  const [gym, setGym] = useState<GymWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [schedule, setSchedule] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photoUrlsText, setPhotoUrlsText] = useState("");

  useEffect(() => {
    if (!gymId) return;
    getGym(gymId)
      .then((g) => {
        setGym(g ?? null);
        if (g) {
          setName(g.name);
          setCity(g.city ?? "");
          setCountry(g.country ?? "");
          setAddress(g.address ?? "");
          setDescription(g.description ?? "");
          setPhone(g.phone ?? "");
          setWebsite(g.website ?? "");
          setSchedule(g.schedule ?? "");
          setImageUrl(g.imageUrl ?? "");
          setPhotoUrlsText((g.photoUrls ?? []).join("\n"));
        }
      })
      .catch(() => setGym(null))
      .finally(() => setLoading(false));
  }, [gymId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!gym || gym.ownerUid !== user?.uid) return;
    setSaving(true);
    try {
      const photoUrls = photoUrlsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateGym(gymId, {
        name: name.trim(),
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        schedule: schedule.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });
      addToast("Gym mis à jour.");
      router.push(`/gyms/${gymId}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Chargement…</p>
      </Layout>
    );
  }

  if (!gym || gym.ownerUid !== user?.uid) {
    return (
      <Layout>
        <p className="text-[var(--muted)]">Gym introuvable ou accès refusé.</p>
        <Link href="/organizer/gyms" className="text-[var(--accent)] mt-4 inline-block hover:underline">
          ← Mes gyms
        </Link>
      </Layout>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <Layout>
      <Link href="/organizer/gyms" className="text-[var(--accent)] mb-4 inline-block hover:underline">
        ← Mes gyms
      </Link>
      <h1 className="text-3xl font-bold mb-2">Modifier le gym</h1>
      <p className="text-[var(--muted)] mb-6">{gym.name}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="text-lg font-bold mb-4">Informations de base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Nom du gym *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ville</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pays</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Adresse complète</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Rue, numéro, code postal" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold mb-4">Présentation</h2>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="Présentation du gym, équipements, ambiance…"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Site web</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://…" />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Horaires d&apos;ouverture</label>
            <textarea
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Ex: Lun–Ven 6h–21h, Sam 8h–14h"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold mb-4">Photos</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Photo de couverture (URL)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputClass}
                placeholder="https://…"
              />
              {imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-[var(--card-border)] max-w-xs">
                  <img src={imageUrl} alt="Aperçu couverture" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Galerie (une URL par ligne)</label>
              <textarea
                value={photoUrlsText}
                onChange={(e) => setPhotoUrlsText(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="https://…&#10;https://…"
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link
            href={`/gyms/${gymId}`}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]"
          >
            Annuler
          </Link>
        </div>
      </form>
    </Layout>
  );
}

export default function EditGymPage() {
  return (
    <OrganizerRoute>
      <EditGymContent />
    </OrganizerRoute>
  );
}
