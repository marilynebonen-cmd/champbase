/**
 * Redimensionne et recadre une image pour remplir un rectangle type bannière (ratio 3:1).
 * Centre le crop, conserve la qualité, retourne un File JPEG pour upload.
 */
const BANNER_ASPECT = 3 / 1; // largeur / hauteur
const MAX_WIDTH = 1800;
const QUALITY = 0.88;

const RESIZE_TIMEOUT_MS = 10000;

export function resizeImageToBanner(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      reject(new Error("Redimensionnement trop long"));
    }, RESIZE_TIMEOUT_MS);
    const done = (result: File) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const imgAspect = w / h;
        let srcX = 0;
        let srcY = 0;
        let srcW = w;
        let srcH = h;
        if (imgAspect > BANNER_ASPECT) {
          srcW = h * BANNER_ASPECT;
          srcX = (w - srcW) / 2;
        } else {
          srcH = w / BANNER_ASPECT;
          srcY = (h - srcH) / 2;
        }
        const outW = Math.min(MAX_WIDTH, Math.round(srcW));
        const outH = Math.round(outW / BANNER_ASPECT);
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail(new Error("Canvas non disponible"));
          return;
        }
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fail(new Error("Échec de la conversion image"));
              return;
            }
            done(new File([blob], "banner.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          QUALITY
        );
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => fail(new Error("Image non lisible"));
    img.src = url;
  });
}

/** Taille cible pour photo de profil / logo (carré). */
const PROFILE_SIZE = 512;
const PROFILE_QUALITY = 0.9;

/**
 * Redimensionne une image en carré centré pour profil athlète ou logo gym.
 * Max 512×512, recadrage au centre, sortie JPEG pour un rendu propre.
 */
export function resizeImageToProfileLogo(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      reject(new Error("Redimensionnement trop long"));
    }, RESIZE_TIMEOUT_MS);
    const done = (result: File) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail(new Error("Canvas non disponible"));
          return;
        }
        // Si l’image est déjà carrée (ex. après recadrage dans la modale), on ne fait que la redimensionner
        // pour respecter le carré sélectionné par l’utilisateur. Sinon, recadrage centré.
        if (w === h) {
          const outputSize = Math.min(w, PROFILE_SIZE);
          canvas.width = outputSize;
          canvas.height = outputSize;
          ctx.drawImage(img, 0, 0, w, h, 0, 0, outputSize, outputSize);
        } else {
          const size = Math.min(w, h, PROFILE_SIZE);
          const srcX = (w - size) / 2;
          const srcY = (h - size) / 2;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, srcX, srcY, size, size, 0, 0, size, size);
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fail(new Error("Échec de la conversion image"));
              return;
            }
            done(new File([blob], "profile.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          PROFILE_QUALITY
        );
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => fail(new Error("Image non lisible"));
    img.src = url;
  });
}
