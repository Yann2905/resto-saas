"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth-context";

export default function QrCodesPage() {
  const router = useRouter();
  const { user, restaurant, loading } = useAuth();
  const [tableCount, setTableCount] = useState(10);
  const [baseUrl, setBaseUrl] = useState("");
  const [codes, setCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loading && !user) router.push("/dashboard/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && !baseUrl) {
      setBaseUrl(window.location.origin);
    }
  }, [baseUrl]);

  const tables = useMemo(
    () => Array.from({ length: tableCount }, (_, i) => i + 1),
    [tableCount]
  );

  const urlFor = (table: number) =>
    restaurant ? `${baseUrl}/r/${restaurant.slug}?table=${table}` : "";

  useEffect(() => {
    if (!restaurant || !baseUrl) return;
    let cancelled = false;
    (async () => {
      const entries: Record<number, string> = {};
      for (const t of tables) {
        entries[t] = await QRCode.toDataURL(urlFor(t), {
          width: 512,
          margin: 2,
          color: { dark: "#0c0a09", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
      }
      if (!cancelled) setCodes(entries);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, baseUrl, restaurant?.slug]);

  const downloadOne = (table: number) => {
    const data = codes[table];
    if (!data || !restaurant) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `qr-${restaurant.slug}-table-${table}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          Chargement…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 print:px-0 print:py-0">
        <div className="mb-6 flex items-baseline justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              QR codes des tables
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Chaque QR code ouvre votre menu avec le numéro de table
              pré-rempli.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            🖨 Imprimer tout
          </button>
        </div>

        {/* Contrôles */}
        <section className="mb-6 bg-white rounded-2xl border border-stone-200 p-5 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                Nombre de tables
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTableCount((n) => Math.max(1, n - 1))}
                  className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={tableCount}
                  onChange={(e) =>
                    setTableCount(
                      Math.max(1, Math.min(200, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-24 text-center rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <button
                  onClick={() => setTableCount((n) => Math.min(200, n + 1))}
                  className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-lg"
                >
                  +
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                URL de base
              </span>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://votre-domaine.com"
                className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                Ex : <code className="font-mono">https://monresto.com</code> en
                production.
              </span>
            </label>
          </div>
        </section>

        {/* Aperçu URL */}
        <div className="mb-6 rounded-xl bg-stone-100 border border-stone-200 p-3 print:hidden">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Exemple pour la table 1
          </div>
          <code className="text-xs md:text-sm font-mono text-stone-900 break-all">
            {urlFor(1)}
          </code>
        </div>

        {/* Grille de QR codes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-3 print:gap-6">
          {tables.map((t) => (
            <div
              key={t}
              className="group bg-white rounded-2xl border border-stone-200 p-4 flex flex-col items-center text-center print:border-2 print:border-stone-900 print:break-inside-avoid"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">
                {restaurant.name}
              </div>
              <div className="text-3xl font-bold text-stone-900 tracking-tight mb-2">
                Table {t}
              </div>
              {codes[t] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={codes[t]}
                  alt={`QR code table ${t}`}
                  className="w-full aspect-square rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square bg-stone-100 rounded-lg flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                </div>
              )}
              <div className="text-[10px] text-stone-500 mt-2">
                Scannez pour commander
              </div>
              <button
                onClick={() => downloadOne(t)}
                className="mt-3 w-full rounded-full bg-stone-100 text-stone-700 py-1.5 text-xs font-semibold hover:bg-stone-200 transition-colors print:hidden"
              >
                ↓ PNG
              </button>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </main>
  );
}
