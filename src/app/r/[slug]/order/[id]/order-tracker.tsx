"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Order, OrderRow, OrderStatus, mapOrder } from "@/types";
import { formatFCFA } from "@/lib/format";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Reçue",
  preparing: "En préparation",
  ready: "Prête à servir",
  served: "Servie",
};

const STATUS_SUB: Record<OrderStatus, string> = {
  pending: "Votre commande vient d'arriver en cuisine.",
  preparing: "Nos chefs préparent votre commande.",
  ready: "Un serveur arrive à votre table.",
  served: "Bon appétit ! Merci de votre visite.",
};

const STATUS_ICON: Record<OrderStatus, string> = {
  pending: "📨",
  preparing: "🔥",
  ready: "🛎",
  served: "✨",
};

const STATUS_ORDER: OrderStatus[] = ["pending", "preparing", "ready", "served"];

type Props = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  orderId: string;
  tableNumber: number | null;
};

export default function OrderTracker({
  restaurantName,
  restaurantSlug,
  orderId,
  tableNumber,
}: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (data) setOrder(mapOrder(data as OrderRow));
      setLoading(false);
    };

    fetchOrder();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(mapOrder(payload.new as OrderRow));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

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

  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-stone-900">Commande introuvable</p>
        </div>
      </main>
    );
  }

  const currentStep = STATUS_ORDER.indexOf(order.status);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            {restaurantName}
          </h1>
          {tableNumber && (
            <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Table {tableNumber}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 text-white shadow-xl shadow-stone-900/10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-14 h-14 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-3xl ${
                order.status !== "served" ? "animate-pulse-ring" : ""
              }`}
            >
              {STATUS_ICON[order.status]}
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                Statut
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {STATUS_LABELS[order.status]}
              </div>
            </div>
          </div>

          <p className="text-sm text-stone-300 mb-5 leading-relaxed">
            {STATUS_SUB[order.status]}
          </p>

          <div className="flex gap-1.5">
            {STATUS_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= currentStep
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-stone-700"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-stone-400 uppercase tracking-wider font-medium">
            {STATUS_ORDER.map((s) => (
              <span key={s}>{STATUS_LABELS[s]}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">Détail</h2>
            <span className="text-[11px] font-mono text-stone-400">
              #{order.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-baseline justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-stone-500">
                    {formatFCFA(item.price)} × {item.quantity}
                  </div>
                </div>
                <div className="font-semibold text-stone-900 tabular-nums">
                  {formatFCFA(item.total)}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 mt-4 pt-4 flex justify-between items-baseline">
            <span className="text-sm uppercase tracking-wider text-stone-500 font-medium">
              Total
            </span>
            <span className="text-2xl font-bold text-stone-900 tracking-tight tabular-nums">
              {formatFCFA(order.total)}
            </span>
          </div>
        </div>

        <Link
          href={`/r/${restaurantSlug}?table=${tableNumber ?? ""}`}
          className="block text-center text-sm text-stone-500 hover:text-stone-900 underline underline-offset-4 pt-2 transition-colors"
        >
          ← Retour au menu
        </Link>
      </div>
    </main>
  );
}
