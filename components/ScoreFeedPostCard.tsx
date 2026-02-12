"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ImageCropModal } from "@/components/ImageCropModal";
import { formatScoreForFeed } from "@/lib/wodScoreUtils";
import { updateScore } from "@/lib/firestore/scores";
import { uploadRootScorePhoto } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { GymFeedItem } from "@/types";
import type { ScoreType } from "@/types";

const FEED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

function formatFeedDate(date: Date): string {
  return date.toLocaleString("fr-CA", FEED_DATE_OPTIONS);
}

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  REPS: "Reps",
  TIME: "Temps",
  WEIGHT: "Poids",
};

type ScoreFeedPostCardProps = {
  item: GymFeedItem;
};

export function ScoreFeedPostCard({ item }: ScoreFeedPostCardProps) {
  const { score, workout, displayName } = item;
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editedComment, setEditedComment] = useState(score.comment || "");
  const [isSavingComment, setIsSavingComment] = useState(false);
  
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const workoutTitle = workout?.name ?? "WOD";
  const workoutInfo = workout
    ? [SCORE_TYPE_LABELS[score.scoreType] ?? score.scoreType, workout.unit ? `(${workout.unit})` : null]
        .filter(Boolean)
        .join(" ")
    : score.scoreType;

  // Vérifier si l'utilisateur courant est l'auteur du score
  const isOwner = user?.uid === score.athleteUid;

  // Handler pour éditer le commentaire
  const handleSaveComment = async () => {
    if (!score.id) return;
    setIsSavingComment(true);
    try {
      await updateScore(score.id, { comment: editedComment.trim() || undefined });
      addToast("Commentaire modifié avec succès", "success");
      setIsEditingComment(false);
    } catch (error) {
      console.error("Error updating comment:", error);
      addToast("Erreur lors de la modification du commentaire", "error");
    } finally {
      setIsSavingComment(false);
    }
  };

  // Handler pour sélectionner une nouvelle photo
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      addToast("Veuillez sélectionner une image", "error");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      addToast("L'image ne doit pas dépasser 5 Mo", "error");
      return;
    }
    
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    setSelectedPhotoFile(file);
    setIsEditingPhoto(true);
  };

  // Handler pour confirmer le crop de la photo
  const handleConfirmCrop = async (croppedFile: File) => {
    if (!score.id || !score.gymId) return;
    
    setIsSavingPhoto(true);
    try {
      // Upload la nouvelle photo
      const { downloadUrl } = await uploadRootScorePhoto(
        score.gymId,
        score.athleteUid,
        croppedFile
      );
      
      // Mettre à jour le score avec la nouvelle URL
      await updateScore(score.id, { photoUrl: downloadUrl });
      
      addToast("Photo modifiée avec succès", "success");
      setIsEditingPhoto(false);
      setPhotoPreviewUrl(null);
      setSelectedPhotoFile(null);
    } catch (error) {
      console.error("Error updating photo:", error);
      addToast("Erreur lors de la modification de la photo", "error");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Handler pour annuler l'édition de photo
  const handleCancelCrop = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setIsEditingPhoto(false);
    setPhotoPreviewUrl(null);
    setSelectedPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar
          photoURL={undefined}
          displayName={displayName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)] truncate">
            {displayName || "—"}
          </p>
          <p className="text-[var(--muted)] text-sm">
            {formatFeedDate(score.createdAt instanceof Date ? score.createdAt : new Date((score.createdAt as { seconds: number }).seconds * 1000))}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3 space-y-2">
        <p className="font-medium text-[var(--foreground)]">{workoutTitle}</p>
        <p className="text-sm text-[var(--muted)]">{workoutInfo}</p>
        <p className="text-lg font-semibold text-[var(--accent)]">
          {formatScoreForFeed(score.scoreType, score.scoreValue)}
        </p>
        {score.division && (
          <span className="inline-block rounded-md px-2.5 py-1 text-xs font-medium bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)]">
            {score.division}
          </span>
        )}
        {/* Commentaire - éditable si propriétaire */}
        {!isEditingComment && score.comment && (
          <div className="relative group">
            <p className="text-[var(--foreground)] whitespace-pre-wrap text-sm pt-1">
              {score.comment}
            </p>
            {isOwner && (
              <button
                onClick={() => {
                  setEditedComment(score.comment || "");
                  setIsEditingComment(true);
                }}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--card-hover)]"
                title="Modifier le commentaire"
              >
                <svg className="w-4 h-4 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Mode édition du commentaire */}
        {isEditingComment && (
          <div className="space-y-2 pt-1">
            <textarea
              value={editedComment}
              onChange={(e) => setEditedComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveComment}
                disabled={isSavingComment}
                className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isSavingComment ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                onClick={() => {
                  setIsEditingComment(false);
                  setEditedComment(score.comment || "");
                }}
                disabled={isSavingComment}
                className="px-3 py-1.5 border border-[var(--card-border)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--card-hover)] disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        
        {/* Bouton pour ajouter un commentaire si aucun et propriétaire */}
        {!score.comment && !isEditingComment && isOwner && (
          <button
            onClick={() => setIsEditingComment(true)}
            className="text-sm text-[var(--muted)] hover:text-[var(--accent)] pt-1"
          >
            + Ajouter un commentaire
          </button>
        )}
        
        {/* Photo - éditable si propriétaire */}
        {score.photoUrl && (
          <div className="relative group mt-2">
            <a
              href={score.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-[var(--card-border)]"
            >
              <img
                src={score.photoUrl}
                alt=""
                className="w-full max-h-80 object-cover"
              />
            </a>
            {isOwner && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-black/70 hover:bg-black/80 text-white"
                title="Modifier la photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Bouton pour ajouter une photo si aucune et propriétaire */}
        {!score.photoUrl && isOwner && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 w-full py-8 border-2 border-dashed border-[var(--card-border)] rounded-lg hover:border-[var(--accent)] hover:bg-[var(--card-hover)] transition-colors text-[var(--muted)] hover:text-[var(--accent)] flex flex-col items-center gap-2"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">Ajouter une photo</span>
          </button>
        )}
        
        {/* Input caché pour sélection de fichier */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>
      
      {/* Modal de crop de photo */}
      {isEditingPhoto && photoPreviewUrl && (
        <ImageCropModal
          imageSrc={photoPreviewUrl}
          aspect={4/3}
          fileName="score-photo.jpg"
          onConfirm={handleConfirmCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </Card>
  );
}
