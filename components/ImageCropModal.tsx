"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";

export interface ImageCropModalProps {
  /** URL de l’image (object URL du fichier sélectionné) */
  imageSrc: string;
  /** Ratio largeur / hauteur (ex: 1 = carré, 3 = bannière 3:1, 21/9 pour event) */
  aspect: number;
  /** Nom du fichier pour le résultat */
  fileName?: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

/**
 * Modal de recadrage : glisser pour positionner, zoom pour cadrer, puis Valider ou Annuler.
 */
export function ImageCropModal({
  imageSrc,
  aspect,
  fileName = "cropped.jpg",
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([blob], fileName, { type: "image/jpeg" });
      onConfirm(file);
    } catch (err) {
      console.error("[ImageCropModal]", err);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer l'image"
    >
      <div className="flex-1 relative min-h-0">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
          style={{
            containerStyle: { background: "var(--background, #0a0a0a)" },
          }}
        />
      </div>
      <div className="flex-shrink-0 flex items-center justify-between gap-4 p-4 border-t border-[var(--card-border)] bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 accent-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || !croppedAreaPixels}
            className="rounded-lg bg-[var(--accent)] text-black px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {confirming ? "Enregistrement…" : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}
