"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";

/**
 * PWA Testing Page - Verify all PWA features are working
 */
export const dynamic = "force-dynamic";

export default function PWATestPage() {
  const [swStatus, setSwStatus] = useState<string>("Checking...");
  const [manifestStatus, setManifestStatus] = useState<string>("Checking...");
  const [installable, setInstallable] = useState<boolean | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [cacheStatus, setCacheStatus] = useState<string>("Checking...");

  useEffect(() => {
    // Check service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          setSwStatus(`✅ Active (${registrations.length} registered)`);
        } else {
          setSwStatus("⚠️ Not registered (run production build)");
        }
      });
    } else {
      setSwStatus("❌ Not supported");
    }

    // Check manifest
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((manifest) => {
        setManifestStatus(`✅ Valid (${manifest.icons?.length || 0} icons)`);
      })
      .catch(() => {
        setManifestStatus("❌ Failed to load");
      });

    // Check if installable
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if standalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    if (standalone) {
      setInstallable(false); // Already installed
    }

    // Check online/offline
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // Check cache API
    if ("caches" in window) {
      caches.keys().then((keyList) => {
        if (keyList.length > 0) {
          setCacheStatus(`✅ ${keyList.length} cache(s) active`);
        } else {
          setCacheStatus("⚠️ No caches yet (build in production)");
        }
      });
    } else {
      setCacheStatus("❌ Cache API not supported");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const getInstallStatus = () => {
    if (isStandalone) return "✅ Installed (running in standalone mode)";
    if (installable === true) return "✅ Installable (prompt available)";
    if (installable === false) return "⚠️ Not installable yet (iOS or no prompt)";
    return "⏳ Checking...";
  };

  const getBrowserInfo = () => {
    if (typeof window === "undefined") return "🖥️ Server";
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return "📱 iOS";
    if (/Android/.test(ua)) return "🤖 Android";
    if (/Windows/.test(ua)) return "💻 Windows";
    if (/Mac/.test(ua)) return "🍎 macOS";
    return "🖥️ Desktop";
  };

  const testOffline = () => {
    if (typeof window !== "undefined") {
      alert(
        "To test offline mode:\n\n" +
        "1. Open DevTools (F12)\n" +
        "2. Go to Network tab\n" +
        "3. Check 'Offline' checkbox\n" +
        "4. Navigate to cached pages\n\n" +
        "Pages loaded from cache will work offline!"
      );
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">PWA Test Page</h1>
          <p className="text-[var(--muted)]">
            Verify that all Progressive Web App features are working correctly.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Service Worker Status */}
          <Card>
            <h2 className="text-xl font-bold mb-4">🔧 Service Worker</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Status:</span>
                <span className="font-mono">{swStatus}</span>
              </div>
              <div className="mt-4 p-3 bg-[var(--muted)]/10 rounded-lg text-xs text-[var(--muted)]">
                Run <code className="px-1 bg-black/30 rounded">npm run build</code> to generate the service worker
              </div>
            </div>
          </Card>

          {/* Manifest Status */}
          <Card>
            <h2 className="text-xl font-bold mb-4">📄 Web App Manifest</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Status:</span>
                <span className="font-mono">{manifestStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Theme:</span>
                <span className="font-mono">#facc15</span>
              </div>
              <a
                href="/manifest.json"
                target="_blank"
                className="block mt-4 text-[var(--accent)] hover:underline text-sm"
              >
                View manifest.json →
              </a>
            </div>
          </Card>

          {/* Installation Status */}
          <Card>
            <h2 className="text-xl font-bold mb-4">📲 Installation</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Status:</span>
                <span className="font-mono text-xs">{getInstallStatus()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Platform:</span>
                <span className="font-mono">{getBrowserInfo()}</span>
              </div>
              {!isStandalone && (
                <a
                  href="/install-prompt"
                  className="block mt-4 text-[var(--accent)] hover:underline text-sm"
                >
                  Installation instructions →
                </a>
              )}
            </div>
          </Card>

          {/* Cache Status */}
          <Card>
            <h2 className="text-xl font-bold mb-4">💾 Cache Storage</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Status:</span>
                <span className="font-mono text-xs">{cacheStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Network:</span>
                <span className="font-mono">
                  {isOnline ? "🟢 Online" : "🔴 Offline"}
                </span>
              </div>
              <button
                onClick={testOffline}
                className="mt-4 text-[var(--accent)] hover:underline text-sm"
              >
                How to test offline mode →
              </button>
            </div>
          </Card>

          {/* Browser Features */}
          <Card className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">🌐 Browser Features</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2">
                <span>{typeof window !== "undefined" && "serviceWorker" in navigator ? "✅" : "❌"}</span>
                <span className="text-[var(--muted)]">Service Workers</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{typeof window !== "undefined" && "caches" in window ? "✅" : "❌"}</span>
                <span className="text-[var(--muted)]">Cache API</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{typeof window !== "undefined" && "Notification" in window ? "✅" : "❌"}</span>
                <span className="text-[var(--muted)]">Notifications (future)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{typeof window !== "undefined" && "PushManager" in window ? "✅" : "❌"}</span>
                <span className="text-[var(--muted)]">Push API (future)</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href="/"
                className="px-4 py-2 bg-[var(--accent)] text-black rounded-xl text-sm font-semibold hover:opacity-90"
              >
                Go to Home
              </a>
              <a
                href="/install-prompt"
                className="px-4 py-2 border border-[var(--card-border)] rounded-xl text-sm font-semibold hover:bg-[var(--card-hover)]"
              >
                Install Instructions
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-[var(--card-border)] rounded-xl text-sm font-semibold hover:bg-[var(--card-hover)]"
              >
                Refresh Page
              </button>
            </div>
          </Card>
        </div>

        {/* Production Notice */}
        {swStatus.includes("production") && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <h3 className="font-semibold text-yellow-500 mb-2">⚠️ Development Mode</h3>
            <p className="text-sm text-[var(--muted)]">
              Service worker is disabled in development for faster hot reload. Run{" "}
              <code className="px-1 bg-black/30 rounded">npm run build && npm start</code> to test PWA features.
            </p>
          </div>
        )}

        {/* Documentation Links */}
        <Card className="mt-6">
          <h2 className="text-xl font-bold mb-4">📚 Documentation</h2>
          <div className="space-y-2 text-sm">
            <a href="/README-PWA.md" className="block text-[var(--accent)] hover:underline">
              → PWA Setup Guide (README-PWA.md)
            </a>
            <a href="/DEPLOYMENT.md" className="block text-[var(--accent)] hover:underline">
              → Deployment Checklist (DEPLOYMENT.md)
            </a>
            <a href="/PWA-COMPLETE.md" className="block text-[var(--accent)] hover:underline">
              → PWA Implementation Summary (PWA-COMPLETE.md)
            </a>
            <a href="/public/ICONS-README.md" className="block text-[var(--accent)] hover:underline">
              → Icon Generation Guide (public/ICONS-README.md)
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
