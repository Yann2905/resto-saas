"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registration failed:", err);
      });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt();
    setInstallPrompt(null);
  };

  if (!installPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 bg-stone-900 text-white rounded-2xl p-4 shadow-2xl animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
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
              className="bg-amber-500 text-stone-950 rounded-full px-4 py-1.5 text-xs font-semibold hover:bg-amber-400 transition-colors"
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
