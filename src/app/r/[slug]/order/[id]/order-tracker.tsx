"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  Inbox,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Order, OrderRow, OrderStatus, mapOrder } from "@/types";
import { formatFCFA } from "@/lib/format";
import DeliveryNav from "@/app/commander/_components/delivery-nav";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Reçue",
  preparing: "En préparation",
  ready: "Prête à servir",
  served: "Servie",
  cancelled: "Annulée",
};

const STATUS_SUB: Record<OrderStatus, string> = {
  pending: "Votre commande vient d'arriver en cuisine.",
  preparing: "Nos chefs préparent votre commande.",
  ready: "Un serveur arrive à votre table.",
  served: "Bon appétit ! Merci de votre visite.",
  cancelled: "Cette commande a été annulée.",
};

const DELIVERY_SUB: Record<OrderStatus, string> = {
  pending: "Votre commande a été reçue. Nous la préparons bientôt.",
  preparing: "Votre commande est en cours de préparation.",
  ready: "Votre commande est prête ! Le livreur arrive bientôt.",
  served: "Votre commande a été livrée. Bon appétit !",
  cancelled: "Cette commande a été annulée.",
};

type OrderWithWaiter = Order & { assignedName?: string | null; acknowledgedAt?: string | null };

const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  pending: Inbox,
  preparing: ChefHat,
  ready: BellRing,
  served: CheckCircle2,
  cancelled: Inbox,
};

const DELIVERY_ICON: Record<OrderStatus, LucideIcon> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Truck,
  served: Package,
  cancelled: Clock,
};

const STATUS_ORDER: OrderStatus[] = ["pending", "preparing", "ready", "served"];

type Props = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantLogoUrl?: string | null;
  orderId: string;
  tableNumber: number | null;
  roomLabel?: string | null;
  deliveryMode?: boolean;
};

export default function OrderTracker({
  restaurantName,
  restaurantSlug,
  restaurantLogoUrl,
  orderId,
  tableNumber,
  roomLabel,
  deliveryMode = false,
}: Props) {
  const locationLabel = deliveryMode
    ? "Livraison"
    : roomLabel
    ? `Chambre ${roomLabel}`
    : tableNumber
    ? `Table ${tableNumber}`
    : null;
  const backParam = deliveryMode
    ? "mode=delivery"
    : roomLabel
    ? `room=${encodeURIComponent(roomLabel)}`
    : `table=${tableNumber ?? ""}`;
  const [order, setOrder] = useState<OrderWithWaiter | null>(null);
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
          <Search className="w-12 h-12 mx-auto mb-3 text-stone-400" aria-hidden />
          <p className="font-semibold text-stone-900">Commande introuvable</p>
        </div>
      </main>
    );
  }

  const currentStep = STATUS_ORDER.indexOf(order.status);
  const statusSub = deliveryMode ? DELIVERY_SUB : STATUS_SUB;
  const statusIcon = deliveryMode ? DELIVERY_ICON : STATUS_ICON;

  if (deliveryMode) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Confirmation card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              order.status === "served"
                ? "bg-emerald-100 text-emerald-600"
                : "bg-[#722F37]/10 text-[#722F37]"
            }`}>
              {(() => {
                const Icon = statusIcon[order.status];
                return <Icon className={`w-8 h-8 ${order.status !== "served" ? "animate-pulse" : ""}`} />;
              })()}
            </div>
            <h1 className="text-xl font-bold text-stone-900 mb-1">
              {order.status === "served" ? "Commande livrée !" : "Commande confirmée"}
            </h1>
            <p className="text-sm text-stone-500 mb-4">{statusSub[order.status]}</p>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-400 bg-stone-50 rounded-full px-3 py-1.5">
              N° #{order.id.slice(0, 6).toUpperCase()}
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 mt-5 justify-center">
              {STATUS_ORDER.map((s, i) => (
                <div
                  key={s}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i <= currentStep ? "bg-[#722F37] scale-110" : "bg-stone-200"
                  } ${i === currentStep && order.status !== "served" ? "animate-pulse" : ""}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 px-2">
              {STATUS_ORDER.map((s, i) => (
                <span key={s} className={`text-[9px] font-medium ${i <= currentStep ? "text-[#722F37]" : "text-stone-300"}`}>
                  {s === "pending" ? "Reçue" : s === "preparing" ? "Préparation" : s === "ready" ? "En route" : "Livrée"}
                </span>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          {order.deliveryQuartier && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#722F37]" />
                <h2 className="font-bold text-sm text-stone-900">Adresse de livraison</h2>
              </div>
              <div className="text-sm text-stone-700 font-medium">{order.deliveryQuartier}</div>
              {order.deliveryCarrefour && (
                <div className="text-xs text-stone-500 mt-0.5">{order.deliveryCarrefour}</div>
              )}
              {order.deliveryPhone && (
                <a href={`tel:${order.deliveryPhone}`} className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-blue-600">
                  <Phone className="w-3.5 h-3.5" />
                  {order.deliveryPhone}
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <h2 className="font-bold text-sm text-stone-900 mb-3">Votre commande</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-stone-100 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-stone-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 text-sm truncate">{item.name}</div>
                    <div className="text-xs text-stone-400">{item.quantity} × {formatFCFA(item.price)}</div>
                  </div>
                  <span className="font-semibold text-sm text-stone-900 tabular-nums flex-shrink-0">
                    {formatFCFA(item.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 mt-4 pt-3 space-y-1.5">
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
                <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Total</span>
                <span className="text-xl font-bold text-stone-900 tabular-nums">{formatFCFA(order.total)}</span>
              </div>
            </div>
          </div>

          <Link
            href="/commander"
            className="block w-full text-center bg-[#722F37] text-white rounded-2xl py-3.5 font-bold text-sm hover:bg-[#5a2530] transition-colors shadow-lg shadow-[#722F37]/20"
          >
            Commander autre chose
          </Link>
        </div>

        <DeliveryNav activeTab="orders" />
      </main>
    );
  }

  // Dine-in / Hotel mode — original tracker
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-2.5">
            {restaurantLogoUrl ? (
              <img src={restaurantLogoUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                {restaurantName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                {restaurantName}
              </h1>
              {locationLabel && (
                <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {locationLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 text-white shadow-xl shadow-stone-900/10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            {(() => {
              const Icon = STATUS_ICON[order.status];
              return (
                <div
                  className={`w-14 h-14 rounded-2xl bg-[#C8963E] text-white flex items-center justify-center ${
                    order.status !== "served" ? "animate-pulse-ring" : ""
                  }`}
                >
                  <Icon className="w-7 h-7" aria-hidden />
                </div>
              );
            })()}
            <div>
              <div className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                Statut
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {STATUS_LABELS[order.status]}
              </div>
            </div>
          </div>

          <p className="text-sm text-stone-300 mb-3 leading-relaxed">
            {STATUS_SUB[order.status]}
          </p>
          {order.acknowledgedAt && order.assignedName && (
            <div className="flex items-center gap-2 mb-3 bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-stone-200">
                Prise en charge par <span className="font-semibold text-white">{order.assignedName}</span>
              </span>
            </div>
          )}

          <div className="flex gap-1.5">
            {STATUS_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= currentStep
                    ? "bg-gradient-to-r from-[#C8963E] to-[#C8963E]"
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
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-stone-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      {formatFCFA(item.price)} × {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-stone-900 tabular-nums flex-shrink-0">
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
          href={`/r/${restaurantSlug}?${backParam}`}
          className="block text-center text-sm text-stone-500 hover:text-stone-900 underline underline-offset-4 pt-2 transition-colors"
        >
          ← Retour au menu
        </Link>
      </div>
    </main>
  );
}
