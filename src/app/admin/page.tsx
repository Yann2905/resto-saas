"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Restaurant,
  RestaurantRow,
  mapRestaurant,
} from "@/types";

type RecentActivity = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | null;
};

export default function AdminOverview() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRestaurants((data ?? []).map((r) => mapRestaurant(r as RestaurantRow)));
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel("admin-restaurants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        fetchAll
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const expMillis = (r: Restaurant) =>
      r.subscriptionExpiresAt
        ? new Date(r.subscriptionExpiresAt).getTime()
        : Infinity;
    const active = restaurants.filter(
      (r) => r.active && expMillis(r) > Date.now()
    ).length;
    const inactive = restaurants.filter((r) => !r.active).length;
    const expired = restaurants.filter(
      (r) => r.active && expMillis(r) <= Date.now()
    ).length;
    const expiringSoon = restaurants.filter((r) => {
      if (!r.active || !r.subscriptionExpiresAt) return false;
      const diff = new Date(r.subscriptionExpiresAt).getTime() - Date.now();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, active, inactive, expired, expiringSoon };
  }, [restaurants]);

  const recent: RecentActivity[] = useMemo(
    () =>
      restaurants.slice(0, 6).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
      })),
    [restaurants]
  );

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
          Chargement…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
          <div className="animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Vue d&apos;ensemble
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Supervision de la plateforme multi-restaurants
            </p>
          </div>
          <Link
            href="/admin/restaurants"
            className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-all hover:scale-105 flex items-center gap-2"
          >
            Gérer les restaurants <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <HeroStat
            label="Restaurants"
            value={stats.total}
            sub="au total"
            color="stone"
            icon="🏪"
            delay={0}
          />
          <HeroStat
            label="Actifs"
            value={stats.active}
            sub={`/ ${stats.total}`}
            color="emerald"
            icon="✓"
            delay={50}
          />
          <HeroStat
            label="Expirations proches"
            value={stats.expiringSoon}
            sub="< 7 jours"
            color="amber"
            icon="⏰"
            delay={100}
          />
          <HeroStat
            label="Expirés"
            value={stats.expired + stats.inactive}
            sub="à régulariser"
            color="red"
            icon="⚠"
            delay={150}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-stone-900">Répartition</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  État des abonnements en direct
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <Bar
                label="Actifs"
                value={stats.active}
                total={stats.total || 1}
                color="bg-emerald-500"
              />
              <Bar
                label="Expiration proche"
                value={stats.expiringSoon}
                total={stats.total || 1}
                color="bg-amber-500"
              />
              <Bar
                label="Expirés / inactifs"
                value={stats.expired + stats.inactive}
                total={stats.total || 1}
                color="bg-red-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 animate-fade-in-up">
            <h3 className="font-bold text-stone-900 mb-1">Récents</h3>
            <p className="text-xs text-stone-500 mb-4">
              Derniers restaurants créés
            </p>
            {recent.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-8">
                Aucun restaurant pour l&apos;instant.
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/admin/restaurants`}
                    className="flex items-center gap-3 rounded-xl hover:bg-stone-50 p-2 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-sm flex-shrink-0">
                      {r.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-900 text-sm truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {r.createdAt
                          ? r.createdAt.toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                    <span className="text-stone-400 text-xs">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-900 to-stone-800 text-white p-6 sm:p-8 animate-fade-in-up overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/60 px-3 py-1 text-[11px] font-medium text-stone-300 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Console super-administrateur
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Toute la plateforme en un seul endroit.
            </h3>
            <p className="text-sm text-stone-400 max-w-xl mb-4 leading-relaxed">
              Créez de nouveaux restaurants, gérez les abonnements, activez ou
              suspendez des comptes. Tout est synchronisé en temps réel.
            </p>
            <Link
              href="/admin/restaurants"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-semibold px-5 py-2.5 text-sm shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-500 transition-all"
            >
              Ouvrir la gestion <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroStat({
  label,
  value,
  sub,
  color,
  icon,
  delay = 0,
}: {
  label: string;
  value: number | string;
  sub: string;
  color: "stone" | "emerald" | "amber" | "red";
  icon: string;
  delay?: number;
}) {
  const colorMap = {
    stone: "from-stone-100 text-stone-700",
    emerald: "from-emerald-50 text-emerald-700",
    amber: "from-amber-50 text-amber-700",
    red: "from-red-50 text-red-700",
  };
  return (
    <div
      className="relative overflow-hidden bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 animate-fade-in-up hover:shadow-md hover:-translate-y-0.5 transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${colorMap[color]
          .split(" ")[0]
          .replace("from-", "bg-")} opacity-60 blur-2xl pointer-events-none`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {label}
          </div>
          <div className="mt-2 font-bold tracking-tight tabular-nums text-3xl sm:text-4xl text-stone-900">
            {value}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">{sub}</div>
        </div>
        <div
          className={`text-lg sm:text-xl rounded-xl bg-gradient-to-br ${colorMap[color]} px-2.5 py-1.5 font-bold`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1.5">
        <span className="text-stone-700 font-medium">{label}</span>
        <span className="text-stone-500 tabular-nums">
          {value} <span className="text-xs text-stone-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
