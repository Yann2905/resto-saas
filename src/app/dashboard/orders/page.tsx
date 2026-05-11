"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Order, OrderRow, OrderStatus, mapOrder } from "@/types";
import { formatFCFA } from "@/lib/format";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prêt",
  served: "Servi",
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};

const STATUS_STYLES: Record<
  OrderStatus,
  { ring: string; badge: string; dot: string; accent: string }
> = {
  pending: {
    ring: "ring-amber-200",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    accent: "from-amber-400/10 to-transparent",
  },
  preparing: {
    ring: "ring-blue-200",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    accent: "from-blue-400/10 to-transparent",
  },
  ready: {
    ring: "ring-emerald-200",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    accent: "from-emerald-400/10 to-transparent",
  },
  served: {
    ring: "ring-stone-200",
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400",
    accent: "from-stone-400/5 to-transparent",
  },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, restaurant, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const [notifPerm, setNotifPerm] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/dashboard/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .neq("status", "served")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []).map((o) => mapOrder(o as OrderRow));
      if (!firstLoad.current) {
        for (const o of list) {
          if (!knownIds.current.has(o.id) && o.status === "pending") {
            playChime();
            tryNotify(o.tableNumber, o.total);
            break;
          }
        }
      }
      knownIds.current = new Set(list.map((o) => o.id));
      firstLoad.current = false;
      setOrders(list);
    };

    fetchOrders();

    const channel = supabase
      .channel(`orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        fetchOrders
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurant]);

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/dashboard/login");
  };

  const requestNotif = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = {
      pending: 0,
      preparing: 0,
      ready: 0,
      served: 0,
    };
    for (const o of orders) c[o.status]++;
    return c;
  }, [orders]);

  const revenueEnCours = useMemo(
    () => orders.reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          Chargement…
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 text-3xl">
            🔒
          </div>
          <p className="font-semibold text-stone-900 mb-1">
            Aucun restaurant associé
          </p>
          <p className="text-sm text-stone-500 mb-6">
            Ce compte n'est lié à aucun établissement.
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-stone-700 underline underline-offset-4"
          >
            Se déconnecter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Commandes en cours
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Mises à jour en temps réel.
            </p>
          </div>
          {notifPerm !== "granted" && (
            <button
              onClick={requestNotif}
              className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Recevoir une notification du navigateur dès qu'une commande arrive, même si l'onglet est en arrière-plan."
            >
              🔔 Activer les notifications
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="En attente" value={counts.pending} color="amber" />
          <StatCard
            label="En préparation"
            value={counts.preparing}
            color="blue"
          />
          <StatCard label="Prêt" value={counts.ready} color="emerald" />
          <StatCard
            label="Revenus en cours"
            value={formatFCFA(revenueEnCours)}
            color="stone"
            isText
          />
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(
            [
              { key: "all", label: `Toutes (${orders.length})` },
              { key: "pending", label: `En attente (${counts.pending})` },
              { key: "preparing", label: `Préparation (${counts.preparing})` },
              { key: "ready", label: `Prêt (${counts.ready})` },
            ] as const
          ).map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as OrderStatus | "all")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5 text-4xl">
              🍽
            </div>
            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Aucune commande
            </h2>
            <p className="text-sm text-stone-500">
              Les nouvelles commandes apparaîtront ici en temps réel.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const st = STATUS_STYLES[order.status];
              const created = order.createdAt
                ? new Date(order.createdAt)
                : null;
              return (
                <div
                  key={order.id}
                  className={`relative overflow-hidden bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${st.accent} pointer-events-none`}
                  />
                  <div className="relative p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-stone-900 tracking-tight">
                            Table {order.tableNumber}
                          </div>
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5 font-mono">
                          #{order.id.slice(0, 6).toUpperCase()} ·{" "}
                          {created
                            ? created.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${st.badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                        />
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm mb-4">
                      {order.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span className="flex-1 truncate text-stone-700">
                            <span className="text-stone-400 font-mono text-xs mr-1.5">
                              {item.quantity}×
                            </span>
                            {item.name}
                          </span>
                          <span className="text-stone-500 tabular-nums text-xs">
                            {formatFCFA(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-stone-200 pt-3 mb-4 flex items-baseline justify-between">
                      <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">
                        Total
                      </span>
                      <span className="text-lg font-bold text-stone-900 tabular-nums tracking-tight">
                        {formatFCFA(order.total)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => advance(order)}
                          className="flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
                        >
                          {STATUS_LABELS[NEXT_STATUS[order.status]!]}
                          <span aria-hidden>→</span>
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 bg-stone-100 text-stone-700 rounded-xl text-sm hover:bg-stone-200 transition-colors"
                        aria-label="Imprimer"
                        title="Imprimer"
                      >
                        🖨
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  isText = false,
}: {
  label: string;
  value: number | string;
  color: "amber" | "blue" | "emerald" | "stone";
  isText?: boolean;
}) {
  const colorMap = {
    amber: "text-amber-600 bg-amber-50",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    stone: "text-stone-700 bg-stone-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div
        className={`mt-1 font-bold tracking-tight tabular-nums ${
          isText ? "text-lg text-stone-900" : `text-3xl`
        } ${!isText ? colorMap[color].split(" ")[0] : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function playChime() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* ignore */
  }
}

function tryNotify(tableNumber: number, total: number) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(`Nouvelle commande · Table ${tableNumber}`, {
      body: `Total : ${total.toLocaleString("fr-FR")} FCFA`,
      icon: "/favicon.ico",
      tag: "new-order",
    });
  } catch {
    /* ignore */
  }
}
