"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import QRCode from "qrcode";
import { FileDown, Printer, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* ── Thèmes couleur pour l'export PDF ───────────────────────── */
const COLOR_THEMES = {
  bleu:   { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff", qrDark: "#1e3a8a", qrLight: "#ffffff", label: "Bleu" },
  vert:   { bg: "#16a34a", border: "#15803d", text: "#ffffff", qrDark: "#14532d", qrLight: "#ffffff", label: "Vert" },
  orange: { bg: "#ea580c", border: "#c2410c", text: "#ffffff", qrDark: "#7c2d12", qrLight: "#ffffff", label: "Orange" },
  rouge:  { bg: "#dc2626", border: "#b91c1c", text: "#ffffff", qrDark: "#7f1d1d", qrLight: "#ffffff", label: "Rouge" },
  violet: { bg: "#7c3aed", border: "#6d28d9", text: "#ffffff", qrDark: "#4c1d95", qrLight: "#ffffff", label: "Violet" },
  sombre: { bg: "#1c1917", border: "#44403c", text: "#fafaf9", qrDark: "#fafaf9", qrLight: "#1c1917", label: "Sombre" },
  blanc:  { bg: "#ffffff", border: "#d6d3d1", text: "#0c0a09", qrDark: "#0c0a09", qrLight: "#ffffff", label: "Blanc" },
} as const;
type ThemeKey = keyof typeof COLOR_THEMES;


export default function QrCodesPage() {
  const { user, restaurant, role, loading } = useAuth();
  const [tableCount, setTableCount] = useState(10);
  const [baseUrl, setBaseUrl] = useState("");
  const [codes, setCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [loading, user]);

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

  /* ── État de la modale export PDF ──────────────────────────── */
  const [showExport, setShowExport] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("blanc");
  const [selectedTables, setSelectedTables] = useState<Set<number>>(
    () => new Set(Array.from({ length: tableCount }, (_, i) => i + 1))
  );

  // Synchro selectedTables quand tableCount change
  useEffect(() => {
    setSelectedTables(new Set(Array.from({ length: tableCount }, (_, i) => i + 1)));
  }, [tableCount]);

  const toggleTable = (t: number) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const previewTables = useMemo(
    () => Array.from(selectedTables).sort((a, b) => a - b),
    [selectedTables],
  );

  /* QR codes re-colorés pour le thème sélectionné */
  const [themedCodes, setThemedCodes] = useState<Record<number, string>>({});
  const genId = useRef(0);

  const generateThemedCodes = useCallback(async () => {
    if (!restaurant || !baseUrl) return;
    const id = ++genId.current;
    const t = COLOR_THEMES[theme];
    const entries: Record<number, string> = {};
    for (const n of previewTables) {
      if (id !== genId.current) return;         // annulé
      entries[n] = await QRCode.toDataURL(urlFor(n), {
        width: 512,
        margin: 2,
        color: { dark: t.qrDark, light: t.qrLight },
        errorCorrectionLevel: "M",
      });
    }
    if (id === genId.current) setThemedCodes(entries);
  }, [restaurant, baseUrl, theme, previewTables]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showExport) generateThemedCodes();
  }, [showExport, generateThemedCodes]);

  /* ── Impression via nouvelle fenêtre ───────────────────────── */
  const handleExportPrint = () => {
    if (!restaurant || previewTables.length === 0) return;
    const th = COLOR_THEMES[theme];

    // Un QR par page — format autocollant
    const pagesHtml = previewTables
      .map((t) => {
        const src = themedCodes[t];
        if (!src) return "";
        return `
      <div class="page" style="background:${th.bg}">
        <div class="card">
          <div class="resto" style="color:${th.text}">${restaurant.name}</div>
          <div class="table-num" style="color:${th.text}">Table ${t}</div>
          <img src="${src}" alt="QR table ${t}" />
          <div class="scan" style="color:${th.text}">Scannez pour commander</div>
        </div>
      </div>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>QR codes – ${restaurant.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Geist',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  background:#fff;-webkit-font-smoothing:antialiased}
.page{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;
  page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.card{width:80%;max-width:400px;border-radius:24px;padding:32px;display:flex;flex-direction:column;
  align-items:center;text-align:center}
.resto{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;
  margin-bottom:8px;opacity:0.85}
.table-num{font-size:48px;font-weight:700;letter-spacing:-0.025em;margin-bottom:20px}
img{width:100%;max-width:320px;aspect-ratio:1/1;border-radius:16px}
.scan{font-size:14px;margin-top:16px;opacity:0.7;font-weight:500}
@media print{
  body{padding:0}
  @page{margin:0;size:auto}
  .page{height:100vh}
}
</style>
</head>
<body>
${pagesHtml}
<script>
window.addEventListener('load',function(){setTimeout(function(){window.print()},300)});
</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="rounded-full bg-amber-500 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" aria-hidden /> Imprimer / Exporter PDF
            </button>
            <button
              onClick={handlePrint}
              className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" aria-hidden /> Imprimer tout
            </button>
          </div>
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

      {/* ── Modale Export PDF ──────────────────────────────────── */}
      {showExport && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 animate-fade-in-up"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExport(false); }}
        >
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl my-4 sm:my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h3 className="text-lg font-bold text-stone-900">
                Imprimer / Exporter PDF
              </h3>
              <button
                onClick={() => setShowExport(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps */}
            <div className="p-5 space-y-6">
              {/* Contrôles */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Couleur */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
                      Couleur du thème
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(COLOR_THEMES) as ThemeKey[]).map((key) => {
                        const t = COLOR_THEMES[key];
                        return (
                          <button
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                              theme === key
                                ? "ring-2 ring-offset-1 ring-stone-900"
                                : "hover:opacity-80"
                            }`}
                            style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info format */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
                      Format d&apos;impression
                    </span>
                    <p className="text-sm text-stone-600">
                      1 QR code par page — idéal pour autocollants
                    </p>
                  </div>
                </div>

                {/* Sélection des tables */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      Tables à imprimer
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">
                        {selectedTables.size} / {tableCount} sélectionnée{selectedTables.size > 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => setSelectedTables(new Set(tables))}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                      >
                        Tout
                      </button>
                      <button
                        onClick={() => setSelectedTables(new Set())}
                        className="text-xs font-semibold text-stone-500 hover:text-stone-700"
                      >
                        Aucune
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tables.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTable(t)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          selectedTables.has(t)
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aperçu live */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-3 block">
                  Aperçu
                </span>
                <div
                  className="rounded-xl border border-stone-200 p-4 overflow-y-auto max-h-[50vh]"
                  style={{ backgroundColor: COLOR_THEMES[theme].bg }}
                >
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                  >
                    {previewTables.map((t) => {
                      const th = COLOR_THEMES[theme];
                      return (
                        <div
                          key={t}
                          className="rounded-2xl p-3 flex flex-col items-center text-center"
                          style={{
                            backgroundColor: th.bg,
                            border: `2px solid ${th.border}`,
                          }}
                        >
                          <div
                            className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1"
                            style={{ color: th.text, opacity: 0.7 }}
                          >
                            {restaurant.name}
                          </div>
                          <div
                            className="text-xl font-bold tracking-tight mb-1.5"
                            style={{ color: th.text }}
                          >
                            Table {t}
                          </div>
                          {themedCodes[t] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={themedCodes[t]}
                              alt={`QR table ${t}`}
                              className="w-full aspect-square rounded-lg"
                            />
                          ) : (
                            <div
                              className="w-full aspect-square rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: th.border + "22" }}
                            >
                              <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                            </div>
                          )}
                          <div
                            className="text-[9px] mt-1.5"
                            style={{ color: th.text, opacity: 0.6 }}
                          >
                            Scannez pour commander
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-5 py-4">
              <button
                onClick={() => setShowExport(false)}
                className="rounded-full bg-stone-100 text-stone-700 px-5 py-2.5 text-sm font-semibold hover:bg-stone-200 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleExportPrint}
                disabled={Object.keys(themedCodes).length === 0}
                className="rounded-full bg-amber-500 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" aria-hidden /> Lancer l&apos;impression
              </button>
            </div>
          </div>
        </div>
      )}

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
