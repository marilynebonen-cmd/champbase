"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";

/**
 * Page d'aide pour l'installation PWA
 */
export default function InstallPromptPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const android = /Android/.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    setIsIOS(iOS);
    setIsAndroid(android);
    setIsStandalone(standalone);
  }, []);

  if (isStandalone) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold mb-4">✅ App installée !</h1>
          <p className="text-[var(--muted)] text-lg">
            Vous utilisez déjà Champ comme application installée.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Installer Champ</h1>
        <p className="text-[var(--muted)] mb-8">
          Installez Champ sur votre appareil pour un accès rapide et une expérience optimale.
        </p>

        {isIOS && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📱</span> Installation sur iOS (iPhone/iPad)
            </h2>
            <ol className="space-y-3 text-[var(--foreground)]">
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">1.</span>
                <span>Ouvrez <strong>Safari</strong> (doit être Safari, pas Chrome)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">2.</span>
                <span>Appuyez sur le bouton <strong>Partager</strong> (carré avec flèche vers le haut)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">3.</span>
                <span>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">4.</span>
                <span>Appuyez sur <strong>"Ajouter"</strong></span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
              <p className="text-sm text-[var(--accent)]">
                💡 L'icône Champ apparaîtra sur votre écran d'accueil
              </p>
            </div>
          </Card>
        )}

        {isAndroid && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🤖</span> Installation sur Android
            </h2>
            <ol className="space-y-3 text-[var(--foreground)]">
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">1.</span>
                <span>Cherchez la notification <strong>"Installer l'application"</strong> en bas de l'écran</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">2.</span>
                <span>Ou appuyez sur le menu <strong>⋮</strong> (trois points)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">3.</span>
                <span>Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">4.</span>
                <span>Confirmez l'installation</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
              <p className="text-sm text-[var(--accent)]">
                💡 L'app s'ouvrira en plein écran comme une app native
              </p>
            </div>
          </Card>
        )}

        {!isIOS && !isAndroid && (
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>💻</span> Installation sur Desktop
            </h2>
            <ol className="space-y-3 text-[var(--foreground)]">
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">1.</span>
                <span>Cherchez l'icône <strong>⊕</strong> dans la barre d'adresse</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">2.</span>
                <span>Ou menu Chrome/Edge → <strong>"Installer Champ"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--accent)]">3.</span>
                <span>Confirmez l'installation</span>
              </li>
            </ol>
          </Card>
        )}

        <Card>
          <h2 className="text-xl font-bold mb-4">✨ Avantages de l'installation</h2>
          <ul className="space-y-2 text-[var(--foreground)]">
            <li>⚡ Accès plus rapide depuis votre écran d'accueil</li>
            <li>📱 Expérience plein écran (pas de barre d'adresse)</li>
            <li>🔔 Notifications push (bientôt disponible)</li>
            <li>📶 Fonctionne partiellement hors ligne</li>
            <li>💾 Données mises en cache pour un chargement plus rapide</li>
          </ul>
        </Card>

        <div className="mt-8 text-center">
          <a 
            href="/"
            className="inline-block text-[var(--accent)] hover:underline"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </Layout>
  );
}
