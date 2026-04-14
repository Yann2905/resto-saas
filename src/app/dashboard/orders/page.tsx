"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Order, OrderStatus } from "@/types";
import { formatFCFA } from "@/lib/format";
// Le header global est rendu par DashboardNav dans le layout.

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
  const { user, restaurant, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!loading && !user) router.push("/dashboard/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!restaurant) return;
    const q = query(
      collection(db, "restaurants", restaurant.id, "orders"),
      where("status", "!=", "served"),
      orderBy("status"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, "id">),
      }));

      if (!firstLoad.current) {
        for (const o of list) {
          if (!knownIds.current.has(o.id) && o.status === "pending") {
            playChime();
            break;
          }
        }
      }
      knownIds.current = new Set(list.map((o) => o.id));
      firstLoad.current = false;
      setOrders(list);
    });
    return () => unsub();
  }, [restaurant]);

  const advance = async (order: Order) => {
    if (!restaurant) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await updateDoc(
      doc(db, "restaurants", restaurant.id, "orders", order.id),
      { status: next, updatedAt: serverTimestamp() }
    );
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/dashboard/login");
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Commandes en cours
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Mises à jour en temps réel.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="En attente"
            value={counts.pending}
            color="amber"
          />
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
                          {order.createdAt?.toDate
                            ? order.createdAt.toDate().toLocaleTimeString(
                                "fr-FR",
                                { hour: "2-digit", minute: "2-digit" }
                              )
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
