"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatFCFA } from "@/lib/format";
import {
  DayRevenue,
  PeakHour,
  StatsSummary,
  TopProduct,
  getPeakHours,
  getRevenueByDay,
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

function rangeDates(r: Range): { from: Date; to: Date; days: number } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
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
  // all : depuis 1 an arrière pour limiter, mais on affiche days = 30 sur le graphique
  from.setFullYear(from.getFullYear() - 1);
  return { from: startOfDay(from), to, days: 30 };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function StatsPage() {
  const router = useRouter();
  const { user, restaurant, loading } = useAuth();
  const [range, setRange] = useState<Range>("14d");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [byDay, setByDay] = useState<DayRevenue[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [peak, setPeak] = useState<PeakHour[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/dashboard/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;
    const { from, to, days } = rangeDates(range);
    setFetching(true);
    Promise.all([
      getSummary(restaurant.id, from, to),
      getRevenueByDay(restaurant.id, days),
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
  }, [restaurant, range]);

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
              Activité de votre restaurant sur la période choisie.
            </p>
          </div>
          <div className="flex gap-1 bg-white border border-stone-200 rounded-full p-1">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  range === r
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <KPI
            label="Chiffre d'affaires"
            value={formatFCFA(summary?.totalRevenue ?? 0)}
            color="emerald"
            icon="💰"
          />
          <KPI
            label="Commandes"
            value={String(summary?.totalOrders ?? 0)}
            color="blue"
            icon="🧾"
          />
          <KPI
            label="Ticket moyen"
            value={formatFCFA(Math.round(summary?.avgTicket ?? 0))}
            color="amber"
            icon="🎯"
          />
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900">Revenu par jour</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {byDay.length} jour{byDay.length > 1 ? "s" : ""} affichés
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
  icon,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "amber";
  icon: string;
}) {
  const map = {
    emerald: "from-emerald-50 text-emerald-700",
    blue: "from-blue-50 text-blue-700",
    amber: "from-amber-50 text-amber-700",
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
        <div
          className={`text-lg rounded-xl bg-gradient-to-br ${map[color]} px-2.5 py-1.5 font-bold`}
        >
          {icon}
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
            {formatFCFA(t.value)}
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
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={data[i].revenue > 0 ? 4 : 3} fill="#d97706" />
            {data[i].revenue > 0 && (
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#92400e"
              >
                {formatFCFA(data[i].revenue)}
              </text>
            )}
            <title>
              {formatDay(data[i].day)} : {formatFCFA(data[i].revenue)} (
              {data[i].ordersCount} commande
              {data[i].ordersCount > 1 ? "s" : ""})
            </title>
          </g>
        ))}
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
