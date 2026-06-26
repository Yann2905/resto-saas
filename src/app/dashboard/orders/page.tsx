"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowRight, Bell, CheckCircle2, Lock, Printer, Volume2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Order, OrderRow, OrderStatus, OrderType, isHotelType, mapOrder } from "@/types";
import { formatFCFA } from "@/lib/format";
import { playChime } from "../_components/order-sound-alert";
import { toastSuccess } from "@/lib/swal";

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
  { ring: string; badge: string; dot: string; accent: string; card: string; dotPulse: boolean }
> = {
  pending: {
    ring: "ring-amber-300",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    dot: "bg-amber-500",
    accent: "from-amber-400/20 to-amber-100/5",
    card: "border-amber-300 shadow-amber-100/50 shadow-md",
    dotPulse: true,
  },
  preparing: {
    ring: "ring-blue-200",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    accent: "from-blue-400/15 to-transparent",
    card: "border-blue-200 shadow-sm",
    dotPulse: true,
  },
  ready: {
    ring: "ring-emerald-300",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dot: "bg-emerald-500",
    accent: "from-emerald-400/20 to-transparent",
    card: "border-emerald-300 shadow-emerald-100/50 shadow-md",
    dotPulse: true,
  },
  served: {
    ring: "ring-stone-200",
    badge: "bg-stone-100 text-stone-500 border-stone-200",
    dot: "bg-stone-300",
    accent: "from-transparent to-transparent",
    card: "border-stone-200 opacity-60",
    dotPulse: false,
  },
};


function clearBadge() {
  if ("clearAppBadge" in navigator) {
    (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {});
  }
}

export default function OrdersPage() {
  const { user, restaurant, role, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<OrderType | "all">("all");
  const isHotel = isHotelType(restaurant?.type);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);
  const [notifPerm, setNotifPerm] =
    useState<NotificationPermission>("default");
  const [realtimeStatus, setRealtimeStatus] =
    useState<string>("connecting");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [user, role, loading]);

  // Stable ID pour éviter des re-runs inutiles quand l'objet restaurant
  // change de référence (refresh auth context) mais pas d'id.
  const restaurantId = restaurant?.id ?? null;

  useEffect(() => {
    clearBadge();
    const onVisible = () => { if (document.visibilityState === "visible") clearBadge(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?restaurantId=${restaurantId}`);
        const json = await res.json();
        if (cancelled || !json.ok) return;
        const list = (json.orders as OrderRow[]).map(mapOrder);
        knownIds.current = new Set(list.map((o) => o.id));
        firstLoadDone.current = true;
        setOrders(list);
      } catch (e) {
        console.error("[orders] fetch crash:", e);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = mapOrder(payload.new as OrderRow);
          if (knownIds.current.has(newOrder.id)) return;
          knownIds.current.add(newOrder.id);
          setOrders((prev) => [newOrder, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = mapOrder(payload.new as OrderRow);
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === updated.id);
            if (!exists) {
              return [updated, ...prev];
            }
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) return;
          knownIds.current.delete(oldId);
          setOrders((prev) => prev.filter((o) => o.id !== oldId));
        }
      )
      .subscribe((status, err) => {
        console.log("[realtime] status:", status, err ?? "");
        setRealtimeStatus(status);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const advance = (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    clearBadge();
    const previousStatus = order.status;
    // Optimistic — UI change instantanément
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    // Fire-and-forget avec rollback si échec
    fetch("/api/orders/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) {
          // Rollback
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: previousStatus } : o
            )
          );
        }
      })
      .catch(() => {
        // Rollback on network error
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, status: previousStatus } : o
          )
        );
      });
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/dashboard/login";
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
    () => orders.filter((o) => o.status !== "served").reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  // Serveurs voient uniquement leurs commandes assignées
  const isWaiter = role === "waiter";

  // Timer 1 min : commandes pending non-acknowledged depuis > 1 min → notifier tout le monde
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newEscalated = new Set(escalatedIds);
      for (const o of orders) {
        if (o.status === "pending" && !o.acknowledgedAt && o.assignedTo) {
          const age = now - new Date(o.createdAt).getTime();
          if (age > 60_000 && !escalatedIds.has(o.id)) {
            newEscalated.add(o.id);
            playChime();
            fetch("/api/orders/escalate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: o.id }),
            }).catch(() => {});
          }
        }
      }
      if (newEscalated.size !== escalatedIds.size) setEscalatedIds(newEscalated);
    }, 10_000);
    return () => clearInterval(interval);
  }, [orders, escalatedIds]);

  const myOrders = isWaiter
    ? orders.filter((o) => o.assignedTo === user?.id || escalatedIds.has(o.id) || !o.assignedTo)
    : orders;

  const byType = typeFilter === "all" ? myOrders : myOrders.filter((o) => o.orderType === typeFilter);
  const filteredOrders =
    filter === "all" ? byType : byType.filter((o) => o.status === filter);

  const acknowledge = async (orderId: string) => {
    const res = await fetch("/api/orders/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const json = await res.json();
    if (json.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, acknowledgedAt: json.acknowledgedAt, assignedName: json.waiterName }
            : o
        )
      );
      void toastSuccess("Commande prise en charge !");
    }
  };

  if (loading && !restaurant) {
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
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-700" aria-hidden />
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

  const liveOk = realtimeStatus === "SUBSCRIBED";

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Commandes en cours
            </h2>
            <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-2">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  liveOk ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                }`}
              />
              {liveOk ? "Temps réel actif" : `Realtime : ${realtimeStatus}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => playChime()}
              className="rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Tester le son"
            >
              <Volume2 className="w-3.5 h-3.5" /> Tester son
            </button>
            {notifPerm !== "granted" && (
              <button
                onClick={requestNotif}
                className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Notifications système même onglet en arrière-plan"
              >
                <Bell className="w-3.5 h-3.5" /> Activer notifications
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="En attente" value={counts.pending} color="amber" />
          <StatCard
            label="En préparation"
            value={counts.preparing}
            color="blue"
          />
          <StatCard label="Prêt" value={counts.ready} color="emerald" />
          <StatCard label="Servi" value={counts.served} color="stone" />
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
              { key: "served", label: `Servi (${counts.served})` },
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

        {isHotel && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {([
              { key: "all", label: "Tous types" },
              { key: "food", label: "Nourriture" },
              { key: "service", label: "Service chambre" },
              { key: "issue", label: "Problèmes" },
            ] as const).map((f) => {
              const active = typeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key as OrderType | "all")}
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
        )}

        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <Bell className="w-10 h-10 text-stone-400" aria-hidden />
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
              const nextStatus = NEXT_STATUS[order.status];
              return (
                <SwipeableCard
                  key={order.id}
                  onSwipe={() => advance(order)}
                  nextLabel={nextStatus ? STATUS_LABELS[nextStatus] : null}
                  disabled={!nextStatus}
                >
                <div
                  className={`relative overflow-hidden bg-white rounded-2xl border transition-all duration-300 animate-fade-in-up hover:shadow-lg ${st.card}`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${st.accent} pointer-events-none`}
                  />
                  <div className="relative p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-stone-900 tracking-tight">
                            {order.roomLabel ? `Chambre ${order.roomLabel}` : `Table ${order.tableNumber}`}
                          </div>
                          {order.orderType !== "food" && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              order.orderType === "service"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {order.orderType === "service" ? "Service" : "Problème"}
                            </span>
                          )}
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
                          className={`w-1.5 h-1.5 rounded-full ${st.dot} ${st.dotPulse ? "animate-pulse" : ""}`}
                        />
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm mb-4">
                      {order.orderType === "food" ? (
                        order.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-stone-100"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-stone-100 flex-shrink-0" />
                              )}
                              <span className="truncate text-stone-700">
                                <span className="text-stone-400 font-mono text-xs mr-1.5">
                                  {item.quantity}×
                                </span>
                                {item.name}
                              </span>
                            </div>
                            <span className="text-stone-500 tabular-nums text-xs flex-shrink-0">
                              {formatFCFA(item.total)}
                            </span>
                          </div>
                        ))
                      ) : (
                        (order.items as unknown as { id: string; label: string }[]).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-stone-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0" />
                            {item.label}
                          </div>
                        ))
                      )}
                    </div>

                    {order.orderType === "food" && (
                      <div className="border-t border-stone-200 pt-3 mb-4 flex items-baseline justify-between">
                        <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">
                          Total
                        </span>
                        <span className="text-lg font-bold text-stone-900 tabular-nums tracking-tight">
                          {formatFCFA(order.total)}
                        </span>
                      </div>
                    )}

                    {/* Assignation & accusé de réception */}
                    {order.assignedTo && (
                      <div className={`flex items-center gap-2 mb-3 text-xs ${order.acknowledgedAt ? "text-emerald-700" : "text-amber-700"}`}>
                        {order.acknowledgedAt ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        <span>
                          {order.acknowledgedAt
                            ? `Pris en charge${order.assignedName ? ` par ${order.assignedName}` : ""}`
                            : `Assigné${order.assignedName ? ` à ${order.assignedName}` : ""} — en attente`
                          }
                        </span>
                      </div>
                    )}
                    {escalatedIds.has(order.id) && !order.acknowledgedAt && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        Commande non prise en charge depuis 1 min{order.assignedName ? ` (${order.assignedName})` : ""}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {order.status === "pending" && !order.acknowledgedAt && (
                        <button
                          onClick={() => acknowledge(order.id)}
                          className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          J&apos;ai reçu
                        </button>
                      )}
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => advance(order)}
                          className={`flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5`}
                        >
                          {STATUS_LABELS[NEXT_STATUS[order.status]!]}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          window.open(
                            `/dashboard/orders/${order.id}/receipt?print=auto`,
                            "_blank"
                          )
                        }
                        className="px-3.5 bg-stone-100 text-stone-700 rounded-xl text-sm hover:bg-stone-200 transition-colors flex items-center justify-center"
                        aria-label="Imprimer le reçu"
                        title="Imprimer le reçu"
                      >
                        <Printer className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
                </SwipeableCard>
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

function SwipeableCard({
  children,
  onSwipe,
  nextLabel,
  disabled,
}: {
  children: React.ReactNode;
  onSwipe: () => void;
  nextLabel: string | null;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !nextLabel) return;
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = true;
  }, [disabled, nextLabel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current || !ref.current) return;
    const diff = e.touches[0].clientX - startX.current;
    currentX.current = Math.max(0, Math.min(diff, 120));
    ref.current.style.transform = `translateX(${currentX.current}px)`;
    ref.current.style.transition = "none";
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current || !ref.current) return;
    swiping.current = false;
    ref.current.style.transition = "transform 0.3s ease";
    if (currentX.current > 80) {
      ref.current.style.transform = "translateX(0)";
      onSwipe();
    } else {
      ref.current.style.transform = "translateX(0)";
    }
    currentX.current = 0;
  }, [onSwipe]);

  return (
    <div className="relative overflow-hidden rounded-2xl md:overflow-visible">
      {nextLabel && (
        <div className="absolute inset-y-0 left-0 w-24 bg-emerald-500 rounded-l-2xl flex items-center justify-center md:hidden">
          <ArrowRight className="w-6 h-6 text-white" />
        </div>
      )}
      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: "translateX(0)" }}
      >
        {children}
      </div>
    </div>
  );
}
