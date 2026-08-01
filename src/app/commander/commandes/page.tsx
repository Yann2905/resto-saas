"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import {
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Order, OrderRow, OrderStatus, mapOrder } from "@/types";
import { formatFCFA } from "@/lib/format";
import DeliveryNav from "@/app/commander/_components/delivery-nav";

type StoredOrder = {
  id: string;
  slug: string;
  status: string;
  restaurantName: string;
  createdAt: string;
};

const STATUS_INFO: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50" },
  preparing: { label: "En préparation", color: "text-blue-700", bg: "bg-blue-50" },
  ready: { label: "En route", color: "text-purple-700", bg: "bg-purple-50" },
  served: { label: "Livrée", color: "text-emerald-700", bg: "bg-emerald-50" },
};

const STATUS_ICON: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Truck,
  served: Package,
};

const STATUS_ORDER: OrderStatus[] = ["pending", "preparing", "ready", "served"];

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [storedOrders, setStoredOrders] = useState<StoredOrder[]>([]);

  const loadOrders = useCallback(async () => {
    const raw = localStorage.getItem("delivery_orders");
    if (!raw) {
      setLoading(false);
      return;
    }
    const stored: StoredOrder[] = JSON.parse(raw);
    setStoredOrders(stored);
    if (stored.length === 0) {
      setLoading(false);
      return;
    }

    const ids = stored.map((o) => o.id);
    const { data } = await supabase
      .from("orders")
      .select("id, restaurant_id, table_number, room_label, status, items, total, created_at, updated_at, order_type, order_mode, assigned_to, acknowledged_at, delivery_phone, delivery_quartier, delivery_carrefour, delivery_fee, payment_status")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped = (data as OrderRow[]).map(mapOrder);
      setOrders(mapped);

      const updated = stored.map((s) => {
        const fresh = mapped.find((m) => m.id === s.id);
        return fresh ? { ...s, status: fresh.status } : s;
      });
      localStorage.setItem("delivery_orders", JSON.stringify(updated));
      window.dispatchEvent(new Event("orders:updated"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (storedOrders.length === 0) return;
    const ids = storedOrders.map((o) => o.id);

    const channel = supabase
      .channel("delivery-orders-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const row = payload.new as OrderRow;
          if (!ids.includes(row.id)) return;
          const updated = mapOrder(row);
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );

          const raw = localStorage.getItem("delivery_orders");
          if (raw) {
            const stored: StoredOrder[] = JSON.parse(raw);
            const newStored = stored.map((s) =>
              s.id === updated.id ? { ...s, status: updated.status } : s
            );
            localStorage.setItem("delivery_orders", JSON.stringify(newStored));
            window.dispatchEvent(new Event("orders:updated"));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storedOrders]);

  const pending = orders.filter((o) => o.status !== "served");
  const delivered = orders.filter((o) => o.status === "served");

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center pb-20">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-[#722F37] rounded-full animate-spin" />
          Chargement…
        </div>
        <DeliveryNav activeTab="orders" />
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] pb-20">
        <header className="bg-white sticky top-0 z-30 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <h1 className="text-lg font-bold text-stone-900">Mes commandes</h1>
            <p className="text-xs text-stone-500">Livraison à domicile</p>
          </div>
        </header>
        <div className="mt-20 text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-10 h-10 text-stone-300" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Aucune commande</h2>
          <p className="text-sm text-stone-500 mb-6">
            Vos commandes de livraison apparaîtront ici.
          </p>
          <Link
            href="/commander"
            className="inline-flex items-center gap-2 rounded-full bg-[#722F37] text-white px-6 py-3 font-semibold hover:bg-[#5a2530] transition-colors"
          >
            Découvrir les restaurants
          </Link>
        </div>
        <DeliveryNav activeTab="orders" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] pb-20">
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-stone-900">Mes commandes</h1>
          <p className="text-xs text-stone-500">
            {pending.length > 0
              ? `${pending.length} commande${pending.length > 1 ? "s" : ""} en cours`
              : "Toutes les commandes livrées"}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Active orders */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#722F37] px-1">
              En cours
            </h2>
            {pending.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                storedOrder={storedOrders.find((s) => s.id === order.id)}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              />
            ))}
          </div>
        )}

        {/* Delivered orders */}
        {delivered.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-1">
              Livrées
            </h2>
            {delivered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                storedOrder={storedOrders.find((s) => s.id === order.id)}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              />
            ))}
          </div>
        )}
      </div>

      <DeliveryNav activeTab="orders" />
    </main>
  );
}

const OrderCard = memo(function OrderCard({
  order,
  storedOrder,
  expanded,
  onToggle,
}: {
  order: Order;
  storedOrder?: StoredOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_INFO[order.status];
  const Icon = STATUS_ICON[order.status];
  const currentStep = STATUS_ORDER.indexOf(order.status);
  const isDelivered = order.status === "served";
  const [showReview, setShowReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${
      isDelivered ? "border-stone-100 opacity-80" : "border-stone-200"
    }`}>
      {/* Header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${status.color} ${!isDelivered ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="font-bold text-stone-900 text-sm">
                {storedOrder?.restaurantName ?? "Restaurant"}
              </div>
              <div className="text-[11px] text-stone-400 font-mono">
                N° #{order.id.slice(0, 6).toUpperCase()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STATUS_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= currentStep ? "bg-[#722F37]" : "bg-stone-100"
              } ${i === currentStep && !isDelivered ? "animate-pulse" : ""}`}
            />
          ))}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
          {/* Delivery address */}
          {order.deliveryQuartier && (
            <div className="bg-blue-50/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Adresse</span>
              </div>
              <div className="text-sm text-blue-900 font-medium">{order.deliveryQuartier}</div>
              {order.deliveryCarrefour && (
                <div className="text-xs text-blue-700 mt-0.5">{order.deliveryCarrefour}</div>
              )}
              {order.deliveryPhone && (
                <a
                  href={`tel:${order.deliveryPhone}`}
                  className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-blue-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3 h-3" />
                  {order.deliveryPhone}
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900 text-sm truncate">{item.name}</div>
                  <div className="text-[11px] text-stone-400">{item.quantity} × {formatFCFA(item.price)}</div>
                </div>
                <span className="font-semibold text-sm text-stone-900 tabular-nums flex-shrink-0">
                  {formatFCFA(item.total)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-stone-100 pt-2 space-y-1">
            {order.deliveryFee > 0 && (
              <>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Sous-total</span>
                  <span>{formatFCFA(order.total - order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Livraison</span>
                  <span>{formatFCFA(order.deliveryFee)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Total</span>
              <span className="text-lg font-bold text-stone-900 tabular-nums">{formatFCFA(order.total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {storedOrder && (
              <Link
                href={`/r/${storedOrder.slug}/order/${order.id}?mode=delivery`}
                className="block w-full text-center bg-stone-100 text-stone-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Voir le suivi
              </Link>
            )}
            {isDelivered && !reviewed && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowReview(true); }}
                className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-100 transition-colors"
              >
                <Star className="w-4 h-4" />
                Donner votre avis
              </button>
            )}
            {reviewed && (
              <div className="text-center text-xs text-emerald-600 font-semibold py-2">
                Merci pour votre avis !
              </div>
            )}
          </div>
        </div>
      )}

      {showReview && (
        <ReviewModal
          restaurantId={order.restaurantId}
          orderId={order.id}
          onClose={() => setShowReview(false)}
          onSuccess={() => { setShowReview(false); setReviewed(true); }}
        />
      )}
    </div>
  );
});

function ReviewModal({
  restaurantId,
  orderId,
  onClose,
  onSuccess,
}: {
  restaurantId: string;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("Client");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Sélectionnez une note."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, orderId, customerName: name, rating, comment: comment || undefined }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error || "Erreur"); setSubmitting(false); return; }
      onSuccess();
    } catch { setError("Erreur réseau."); setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">Votre avis</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                <Star className={`w-9 h-9 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}`} />
              </button>
            ))}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#722F37]/20 focus:outline-none"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un commentaire ? (optionnel)"
            rows={3}
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-[#722F37]/20 focus:outline-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full rounded-xl bg-[#722F37] text-white font-bold py-3 hover:bg-[#5a2530] disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
