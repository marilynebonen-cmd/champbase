"use client";

import { useRef, useState } from "react";
import { ImageCropModal } from "@/components/ImageCropModal";

export interface PhotoUploaderProps {
  label: string;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  /** Si défini, ouvre le recadrage avant upload (ex: 1 = carré, 3 = bannière 3:1). */
  aspectRatio?: number;
}

/**
 * Composant réutilisable d’upload de photo : input file image/*, option recadrage, loading et message d’erreur.
 */
export function PhotoUploader({ label, onUpload, disabled, aspectRatio }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ file: File; imageSrc: string } | null>(null);

  async function doUpload(file: File) {
    setError(null);
    setLoading(true);
    try {
      await onUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (aspectRatio != null && aspectRatio > 0) {
      setCropState({ file, imageSrc: URL.createObjectURL(file) });
      return;
    }
    doUpload(file);
  }

  function handleCropConfirm(croppedFile: File) {
    const url = cropState?.imageSrc;
    setCropState(null);
    if (url) URL.revokeObjectURL(url);
    if (inputRef.current) inputRef.current.value = "";
    doUpload(croppedFile);
  }

  function handleCropCancel() {
    const url = cropState?.imageSrc;
    setCropState(null);
    if (url) URL.revokeObjectURL(url);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled || loading}
        className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-black file:font-medium file:cursor-pointer hover:file:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={label}
      />
      {loading && <p className="text-sm text-[var(--muted)]">Envoi en cours…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {cropState && (
        <ImageCropModal
          imageSrc={cropState.imageSrc}
          aspect={aspectRatio ?? 1}
          fileName="cropped.jpg"
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
