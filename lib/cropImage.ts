/**
 * Produit un blob JPEG à partir de l’image et de la zone recadrée (pixels).
 * Utilisé après react-easy-crop (onCropComplete → croppedAreaPixels).
 */
export type CropArea = { x: number; y: number; width: number; height: number };

export function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  outputType: "image/jpeg" = "image/jpeg",
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
    image.onload = () => {
      const x = Math.round(pixelCrop.x);
      const y = Math.round(pixelCrop.y);
      const w = Math.round(pixelCrop.width);
      const h = Math.round(pixelCrop.height);
      if (w <= 0 || h <= 0) {
        reject(new Error("Zone de recadrage invalide"));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas non disponible"));
        return;
      }
      ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Échec de la conversion"));
        },
        outputType,
        quality
      );
    };
    image.onerror = () => reject(new Error("Image non chargée"));
  });
}
