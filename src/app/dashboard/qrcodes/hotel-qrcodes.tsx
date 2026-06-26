"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { FileDown, Plus, Printer, Trash2, X } from "lucide-react";
import { updateRestaurant } from "@/lib/admin";
import type { Restaurant } from "@/types";

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
type ThemeColors = (typeof COLOR_THEMES)[ThemeKey];

const PRINT_HEAD = `<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap" rel="stylesheet"/>`;

const PRINT_SCRIPT = `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)});</script>`;

function buildRoomHtml(name: string, th: ThemeColors, rooms: string[], codes: Record<string, string>): string {
  const pages = rooms
    .map((r) => {
      const src = codes[r];
      if (!src) return "";
      return `<div class="page" style="background:${th.bg}">
        <div class="card">
          <div class="resto" style="color:${th.text}">${name}</div>
          <div class="room-label" style="color:${th.text}">Chambre ${r}</div>
          <img src="${src}" alt="QR chambre ${r}" />
          <div class="scan" style="color:${th.text}">Scannez pour commander</div>
        </div>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html><html lang="fr"><head>${PRINT_HEAD}
<title>QR codes – ${name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Geist',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff;-webkit-font-smoothing:antialiased}
.page{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.card{width:80%;max-width:400px;border-radius:24px;padding:32px;display:flex;flex-direction:column;align-items:center;text-align:center}
.resto{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;opacity:0.85}
.room-label{font-size:36px;font-weight:700;letter-spacing:-0.025em;margin-bottom:20px}
img{width:100%;max-width:320px;aspect-ratio:1/1;border-radius:16px}
.scan{font-size:14px;margin-top:16px;opacity:0.7;font-weight:500}
@media print{body{padding:0}@page{margin:0;size:auto}.page{height:100vh}}
</style></head><body>${pages}${PRINT_SCRIPT}</body></html>`;
}

type Props = {
  restaurant: Restaurant;
};

export default function HotelQrCodes({ restaurant }: Props) {
  const [rooms, setRooms] = useState<string[]>(restaurant.hotelRooms ?? []);
  const [newRoom, setNewRoom] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("blanc");
  const [themedCodes, setThemedCodes] = useState<Record<string, string>>({});
  const genId = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !baseUrl) {
      setBaseUrl(window.location.origin);
    }
  }, [baseUrl]);

  const urlFor = useCallback(
    (room: string) => `${baseUrl}/r/${restaurant.slug}?room=${encodeURIComponent(room)}`,
    [baseUrl, restaurant.slug],
  );

  useEffect(() => {
    if (!baseUrl || rooms.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const r of rooms) {
        if (cancelled) return;
        entries[r] = await QRCode.toDataURL(urlFor(r), {
          width: 512,
          margin: 2,
          color: { dark: "#0c0a09", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
      }
      if (!cancelled) setCodes(entries);
    })();
    return () => { cancelled = true; };
  }, [rooms, baseUrl, urlFor]);

  const addRoom = () => {
    const label = newRoom.trim();
    if (!label || rooms.includes(label)) return;
    setRooms((prev) => [...prev, label]);
    setNewRoom("");
  };

  const removeRoom = (r: string) => {
    setRooms((prev) => prev.filter((x) => x !== r));
  };

  const saveRooms = async () => {
    setSaving(true);
    try {
      await updateRestaurant({
        restaurantId: restaurant.id,
        hotelRooms: rooms,
      });
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const downloadOne = (room: string) => {
    const data = codes[room];
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `qr-${restaurant.slug}-chambre-${room.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const generateThemedCodes = useCallback(async () => {
    if (!baseUrl || rooms.length === 0) return;
    const id = ++genId.current;
    const t = COLOR_THEMES[theme];
    const entries: Record<string, string> = {};
    for (const r of rooms) {
      if (id !== genId.current) return;
      entries[r] = await QRCode.toDataURL(urlFor(r), {
        width: 512,
        margin: 2,
        color: { dark: t.qrDark, light: t.qrLight },
        errorCorrectionLevel: "M",
      });
    }
    if (id === genId.current) setThemedCodes(entries);
  }, [baseUrl, rooms, theme, urlFor]);

  useEffect(() => {
    if (showExport) generateThemedCodes();
  }, [showExport, generateThemedCodes]);

  const handleExportPrint = () => {
    if (rooms.length === 0) return;
    const th = COLOR_THEMES[theme];
    const html = buildRoomHtml(restaurant.name, th, rooms, themedCodes);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              QR codes des chambres
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Chaque QR code ouvre le menu avec le nom de la chambre pré-rempli.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rooms.length > 0 && (
              <button
                onClick={() => setShowExport(true)}
                className="rounded-full bg-amber-500 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4" /> Exporter PDF
              </button>
            )}
          </div>
        </div>

        {/* Ajouter une chambre */}
        <section className="mb-6 bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-bold text-stone-900 mb-3">
            Ajouter une chambre
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
              placeholder="Ex: 101, Suite Royale, Cocotier..."
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
            <button
              onClick={addRoom}
              className="rounded-xl bg-stone-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          {rooms.length > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={saveRooms}
                disabled={saving}
                className="rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:bg-stone-400"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder les chambres"}
              </button>
            </div>
          )}
        </section>

        {/* Grille de QR codes */}
        {rooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏨</span>
            </div>
            <p className="text-stone-500 text-sm">
              Ajoutez vos chambres ci-dessus pour générer les QR codes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {rooms.map((r) => (
              <div
                key={r}
                className="group bg-white rounded-2xl border border-stone-200 p-4 flex flex-col items-center text-center relative"
              >
                <button
                  onClick={() => removeRoom(r)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-stone-100 text-stone-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 mb-2">
                  {restaurant.name}
                </div>
                <div className="text-2xl font-bold text-stone-900 tracking-tight mb-2 truncate w-full">
                  Chambre {r}
                </div>
                {codes[r] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={codes[r]}
                    alt={`QR chambre ${r}`}
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
                  onClick={() => downloadOne(r)}
                  className="mt-3 w-full rounded-full bg-stone-100 text-stone-700 py-1.5 text-xs font-semibold hover:bg-stone-200 transition-colors"
                >
                  ↓ PNG
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Export */}
      {showExport && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 animate-fade-in-up"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExport(false); }}
        >
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h3 className="text-lg font-bold text-stone-900">Exporter les QR codes</h3>
              <button
                onClick={() => setShowExport(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
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
                          theme === key ? "ring-2 ring-offset-1 ring-stone-900" : "hover:opacity-80"
                        }`}
                        style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-3 block">
                  Aperçu
                </span>
                <div
                  className="rounded-xl border border-stone-200 p-4 overflow-y-auto max-h-[50vh]"
                  style={{ backgroundColor: COLOR_THEMES[theme].bg }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {rooms.map((r) => {
                      const th = COLOR_THEMES[theme];
                      return (
                        <div
                          key={r}
                          className="rounded-2xl p-3 flex flex-col items-center text-center"
                          style={{ backgroundColor: th.bg, border: `2px solid ${th.border}` }}
                        >
                          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: th.text, opacity: 0.7 }}>
                            {restaurant.name}
                          </div>
                          <div className="text-lg font-bold tracking-tight mb-1.5 truncate w-full" style={{ color: th.text }}>
                            {r}
                          </div>
                          {themedCodes[r] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={themedCodes[r]} alt={`QR ${r}`} className="w-full aspect-square rounded-lg" />
                          ) : (
                            <div className="w-full aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: th.border + "22" }}>
                              <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="text-[9px] mt-1.5" style={{ color: th.text, opacity: 0.6 }}>
                            Scannez pour commander
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

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
                className="rounded-full bg-amber-500 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Lancer l&apos;impression
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
