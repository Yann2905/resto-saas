"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Wallet, Receipt, Target, Calendar, ChevronDown } from "lucide-react";
import { formatCompactFCFA, formatFCFA } from "@/lib/format";
import {
  DayRevenue,
  PeakHour,
  StatsSummary,
  TopProduct,
  getPeakHours,
  getRevenueByDay,
  getRevenueSeries,
  getSummary,
  getTopProducts,
} from "@/lib/stats";

type Range = "7d" | "14d" | "30d" | "all";

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 jours",
  "14d": "14 jours",
  "30d": "30 jours",
  all: "Tout",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeDates(r: Range): { from: Date; to: Date; days: number } {
  const to = endOfDay(new Date());
  const from = new Date(to);
  if (r === "7d") {
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to, days: 7 };
  }
  if (r === "14d") {
    from.setDate(from.getDate() - 13);
    return { from: startOfDay(from), to, days: 14 };
  }
  if (r === "30d") {
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to, days: 30 };
  }
  // all : 1 an en arrière
  from.setFullYear(from.getFullYear() - 1);
  return { from: startOfDay(from), to, days: 30 };
}

// monthKey : "YYYY-MM"
function monthRange(monthKey: string): { from: Date; to: Date } {
  const [y, m] = monthKey.split("-").map((v) => parseInt(v, 10));
  const from = startOfDay(new Date(y, m - 1, 1));
  // Dernier jour = jour 0 du mois suivant
  const to = endOfDay(new Date(y, m, 0));
  return { from, to };
}

function lastNMonths(n = 12): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

export default function StatsPage() {
  const router = useRouter();
  const { user, restaurant, role, loading } = useAuth();
  // Mode "range" (7d/14d/30d/all) ou "month" (un mois précis)
  const [range, setRange] = useState<Range>("14d");
  const [month, setMonth] = useState<string>(""); // "" = mode range
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [byDay, setByDay] = useState<DayRevenue[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [peak, setPeak] = useState<PeakHour[]>([]);
  const [fetching, setFetching] = useState(true);

  const months = useMemo(() => lastNMonths(12), []);

  useEffect(() => {
    if (!loading && !user && !role) router.push("/dashboard/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;

    const { from, to } = month
      ? monthRange(month)
      : rangeDates(range);

    setFetching(true);
    const dayQuery = month
      ? getRevenueSeries(restaurant.id, from, to)
      : getRevenueByDay(restaurant.id, rangeDates(range).days);

    Promise.all([
      getSummary(restaurant.id, from, to),
      dayQuery,
      getTopProducts(restaurant.id, from, to, 5),
      getPeakHours(restaurant.id, from, to),
    ])
      .then(([s, d, t, p]) => {
        if (cancelled) return;
        setSummary(s);
        setByDay(d);
        setTop(t);
        setPeak(p);
        setFetching(false);
      })
      .catch(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant, range, month]);

  const periodLabel = month
    ? months.find((m) => m.key === month)?.label ?? month
    : RANGE_LABELS[range];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Statistiques
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Période : <span className="font-semibold">{periodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggles relatifs : 7j / 14j / 30j / Tout */}
            <div className="flex gap-1 bg-white border border-stone-200 rounded-full p-1">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => {
                const active = !month && range === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setMonth("");
                      setRange(r);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`appearance-none rounded-full pl-9 pr-9 py-2 text-xs font-semibold border transition-all cursor-pointer ${
                  month
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                <option value="">— Choisir un mois —</option>
                {months.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar
                className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  month ? "text-white" : "text-stone-500"
                }`}
                aria-hidden
              />
              <ChevronDown
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  month ? "text-white" : "text-stone-500"
                }`}
                aria-hidden
              />
            </div>

            {month && (
              <button
                onClick={() => setMonth("")}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                title="Revenir à une période relative"
                aria-label="Effacer la sélection du mois"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <KPI
            label="Chiffre d'affaires"
            value={formatFCFA(summary?.totalRevenue ?? 0)}
            color="emerald"
            Icon={Wallet}
          />
          <KPI
            label="Commandes"
            value={String(summary?.totalOrders ?? 0)}
            color="blue"
            Icon={Receipt}
          />
          <KPI
            label="Ticket moyen"
            value={formatFCFA(Math.round(summary?.avgTicket ?? 0))}
            color="amber"
            Icon={Target}
          />
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900">Revenu par jour</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {periodLabel} · {byDay.length} jour
                {byDay.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {fetching ? (
            <SkeletonChart />
          ) : (
            <RevenueChart data={byDay} />
          )}
        </section>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-1">Top 5 produits</h3>
            <p className="text-xs text-stone-500 mb-4">
              Classement par chiffre d'affaires
            </p>
            <TopProductsList items={top} />
          </section>

          <section className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-1">Heures de pointe</h3>
            <p className="text-xs text-stone-500 mb-4">
              Commandes par heure de la journée
            </p>
            <PeakHoursChart data={peak} />
          </section>
        </div>
      </div>
    </main>
  );
}

function KPI({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "amber";
  Icon: typeof Wallet;
}) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {label}
          </div>
          <div className="mt-1 font-bold tracking-tight text-stone-900 text-xl sm:text-2xl tabular-nums truncate">
            {value}
          </div>
        </div>
        <div className={`rounded-xl ${map[color]} p-2.5`}>
          <Icon className="w-5 h-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="h-56 rounded-xl bg-stone-100 animate-pulse" />
  );
}

// Round up to the next "nice" round number for axis scale (100/500/1k/5k/etc.)
function niceCeil(n: number): number {
  if (n <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

function RevenueChart({ data }: { data: DayRevenue[] }) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-stone-400 text-sm">
        Pas de données
      </div>
    );
  }
  const rawMax = Math.max(...data.map((d) => d.revenue), 0);
  // Si aucune vente : on garde une échelle minimale lisible (1000 FCFA)
  const niceMax = rawMax > 0 ? niceCeil(rawMax) : 1000;
  const w = 800;
  const h = 240;
  const pad = { l: 64, r: 16, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const pts = data.map((d, i) => {
    const x = pad.l + i * step;
    const y = pad.t + innerH - (d.revenue / niceMax) * innerH;
    return [x, y] as const;
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad.l},${pad.t + innerH} ${polyline} ${pad.l + innerW},${
    pad.t + innerH
  }`;

  // 5 graduations Y : 0, 25%, 50%, 75%, 100% de niceMax
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: pad.t + innerH * (1 - p),
    value: Math.round(niceMax * p),
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[600px]">
        {yTicks.map((t, i) => (
          <line
            key={`g-${i}`}
            x1={pad.l}
            x2={pad.l + innerW}
            y1={t.y}
            y2={t.y}
            stroke="#e7e5e4"
            strokeDasharray="3 3"
          />
        ))}
        {yTicks.map((t, i) => (
          <text
            key={`l-${i}`}
            x={pad.l - 8}
            y={t.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#78716c"
          >
            {formatCompactFCFA(t.value)}
          </text>
        ))}
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#rev-grad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#d97706"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map(([x, y], i) => {
          const isFirst = i === 0;
          const isLast = i === pts.length - 1;
          const anchor: "start" | "end" | "middle" = isFirst
            ? "start"
            : isLast
              ? "end"
              : "middle";
          const labelX = isFirst ? x + 4 : isLast ? x - 4 : x;
          return (
          <g key={i}>
            <circle cx={x} cy={y} r={data[i].revenue > 0 ? 4 : 3} fill="#d97706" />
            {data[i].revenue > 0 && (
              <text
                x={labelX}
                y={y - 8}
                textAnchor={anchor}
                fontSize="10"
                fontWeight="600"
                fill="#92400e"
              >
                {formatCompactFCFA(data[i].revenue)}
              </text>
            )}
            <title>
              {formatDay(data[i].day)} : {formatFCFA(data[i].revenue)} (
              {data[i].ordersCount} commande
              {data[i].ordersCount > 1 ? "s" : ""})
            </title>
          </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * step;
          const show =
            data.length <= 14 ||
            i === 0 ||
            i === data.length - 1 ||
            i % Math.ceil(data.length / 10) === 0;
          if (!show) return null;
          return (
            <text
              key={i}
              x={x}
              y={h - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#78716c"
            >
              {formatDayShort(d.day)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function PeakHoursChart({ data }: { data: PeakHour[] }) {
  if (data.length === 0)
    return (
      <div className="h-40 flex items-center justify-center text-stone-400 text-sm">
        Pas de données
      </div>
    );
  const max = Math.max(...data.map((d) => d.ordersCount), 1);
  return (
    <div className="grid grid-cols-24 gap-px h-40">
      {data.map((d) => {
        const pct = (d.ordersCount / max) * 100;
        return (
          <div
            key={d.hour}
            className="relative flex flex-col items-center justify-end h-full"
            title={`${String(d.hour).padStart(2, "0")}h : ${
              d.ordersCount
            } commande${d.ordersCount > 1 ? "s" : ""}`}
          >
            <div
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm"
              style={{ height: `${pct}%`, minHeight: pct > 0 ? "2px" : "0" }}
            />
            {d.hour % 4 === 0 && (
              <span className="absolute -bottom-5 text-[9px] text-stone-500">
                {String(d.hour).padStart(2, "0")}
              </span>
            )}
          </div>
        );
      })}
      <style jsx>{`
        .grid-cols-24 {
          grid-template-columns: repeat(24, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}

function TopProductsList({ items }: { items: TopProduct[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm text-stone-500 text-center py-8">
        Pas encore de ventes.
      </p>
    );
  const max = Math.max(...items.map((i) => i.revenue), 1);
  return (
    <div className="space-y-3">
      {items.map((p, i) => {
        const pct = (p.revenue / max) * 100;
        return (
          <div key={p.productId}>
            <div className="flex items-baseline justify-between text-sm mb-1.5">
              <span className="text-stone-800 font-medium flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="truncate">{p.productName}</span>
              </span>
              <span className="text-stone-500 tabular-nums text-xs flex-shrink-0">
                {formatFCFA(p.revenue)} ·{" "}
                <span className="text-stone-400">{p.qtySold}u</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
function formatDayShort(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}
