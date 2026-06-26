"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        reg = r;

        r.addEventListener("updatefound", () => {
          const newSw = r.installing;
          if (!newSw) return;
          newSw.addEventListener("statechange", () => {
            if (newSw.state === "activated") {
              setUpdating(true);
              setTimeout(() => window.location.reload(), 1500);
            }
          });
        });
      })
      .catch((err) => console.warn("[sw] registration failed:", err));

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      setUpdating(true);
      setTimeout(() => window.location.reload(), 1500);
    });

    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "SW_UPDATED") {
        setUpdating(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    });

    const interval = setInterval(() => {
      reg?.update().catch(() => {});
    }, 60_000);

    if ("clearAppBadge" in navigator) {
      (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt();
    setInstallPrompt(null);
  };

  if (updating) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-emerald-900 text-white rounded-2xl p-4 shadow-2xl animate-fade-in-up">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">Mise à jour en cours</div>
            <p className="text-xs text-emerald-300 mt-0.5">
              Nouvelle version détectée, rechargement…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!installPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 bg-[#722F37] text-white rounded-2xl p-4 shadow-2xl animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#C8963E] flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-stone-950" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Installer l&apos;app</div>
          <p className="text-xs text-stone-400 mt-0.5">
            Recevez les notifications même quand le navigateur est fermé
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="bg-[#C8963E] text-white rounded-full px-4 py-1.5 text-xs font-semibold hover:bg-[#C8963E] transition-colors"
            >
              Installer
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-stone-400 hover:text-white text-xs"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-stone-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
