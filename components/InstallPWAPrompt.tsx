"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Component to show PWA installation prompt (non-intrusive)
 * Shows only on mobile and only if not already installed
 */
export function InstallPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    // Check if dismissed before
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) return;

    // Check if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Listen for install prompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS (no beforeinstallprompt event), show after 3 seconds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS or no prompt available - redirect to instructions
      window.location.href = "/install-prompt";
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("PWA installed");
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center text-2xl">
              📱
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--foreground)] mb-1">
                Installer Champ
              </h3>
              <p className="text-sm text-[var(--muted)] mb-3">
                Accès rapide depuis votre écran d'accueil
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-[var(--accent)] text-black rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Installer
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-[var(--muted)] text-sm font-medium hover:text-[var(--foreground)] transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
