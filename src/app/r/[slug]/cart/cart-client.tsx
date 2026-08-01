"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2, MapPin, Phone, ShoppingCart, Truck } from "lucide-react";
import DeliveryNav from "@/app/commander/_components/delivery-nav";
import { CartItem } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  cartTotal,
  clearCart,
  getCart,
  updateQuantity,
} from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { createOrder } from "@/lib/orders";

type StockIssue = { name: string; requested: number; available: number };

type Props = {
  restaurant: { id: string; name: string; slug: string };
  tableNumber: number | null;
  roomLabel?: string | null;
  deliveryMode?: boolean;
  deliveryFee?: number;
};

export default function CartClient({ restaurant, tableNumber, roomLabel, deliveryMode = false, deliveryFee = 0 }: Props) {
  const router = useRouter();
  const tableKey = deliveryMode ? "delivery" : (roomLabel ?? String(tableNumber));
  const locationLabel = deliveryMode ? "Livraison" : (roomLabel ? `Chambre ${roomLabel}` : `Table ${tableNumber}`);
  const locationParam = deliveryMode
    ? "mode=delivery"
    : roomLabel
    ? `room=${encodeURIComponent(roomLabel)}`
    : `table=${tableNumber}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);

  // Delivery form fields
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryQuartier, setDeliveryQuartier] = useState("");
  const [deliveryCarrefour, setDeliveryCarrefour] = useState("");

  useEffect(() => {
    setItems(getCart(restaurant.id, tableKey));
    const refresh = () => setItems(getCart(restaurant.id, tableKey));
    window.addEventListener("cart:updated", refresh);
    return () => window.removeEventListener("cart:updated", refresh);
  }, [restaurant.id, tableKey]);

  const changeQty = (productId: string, qty: number) => {
    updateQuantity(restaurant.id, tableKey, productId, qty);
  };

  const checkStock = async () => {
    setCheckingStock(true);
    setStockIssues([]);
    setError(null);
    const productIds = items.map((i) => i.productId);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, stock_quantity, stock_consumption, category_id")
      .in("id", productIds);
    setCheckingStock(false);
    if (!products) {
      setShowConfirm(true);
      return;
    }

    const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
    let catStockMap = new Map<string, number | null>();
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, stock")
        .in("id", categoryIds);
      for (const c of cats ?? []) catStockMap.set(c.id, c.stock);
    }

    const catConsumption = new Map<string, number>();
    const issues: StockIssue[] = [];

    for (const item of items) {
      const p = products.find((pr) => pr.id === item.productId);
      if (!p) continue;
      const catStock = p.category_id ? catStockMap.get(p.category_id) : null;

      if (catStock !== null && catStock !== undefined) {
        const consumption = (p.stock_consumption ?? 1) * item.quantity;
        const alreadyUsed = catConsumption.get(p.category_id) ?? 0;
        const totalNeeded = alreadyUsed + consumption;
        if (totalNeeded > catStock) {
          const availableUnits = Math.floor((catStock - alreadyUsed) / (p.stock_consumption ?? 1));
          issues.push({ name: p.name, requested: item.quantity, available: Math.max(0, availableUnits) });
        }
        catConsumption.set(p.category_id, totalNeeded);
      } else {
        if (p.stock_quantity < item.quantity) {
          issues.push({ name: p.name, requested: item.quantity, available: p.stock_quantity });
        }
      }
    }

    if (issues.length > 0) {
      setStockIssues(issues);
    } else {
      setStockIssues([]);
      setShowConfirm(true);
    }
  };

  const handleSubmit = async () => {
    if (deliveryMode) {
      if (!deliveryPhone.trim()) {
        setError("Numéro de téléphone requis pour la livraison");
        return;
      }
      if (!deliveryQuartier.trim()) {
        setError("Quartier requis pour la livraison");
        return;
      }
      if (!deliveryCarrefour.trim()) {
        setError("Carrefour / point de repère requis pour la livraison");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    const deliveryParams = deliveryMode ? {
      orderMode: "delivery" as const,
      deliveryPhone: deliveryPhone.trim(),
      deliveryQuartier: deliveryQuartier.trim(),
      deliveryCarrefour: deliveryCarrefour.trim(),
      deliveryFee,
    } : null;
    const res = await createOrder(restaurant.id, tableNumber, items, roomLabel, deliveryParams);
    setSubmitting(false);
    setShowConfirm(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clearCart(restaurant.id, tableKey);
    if (deliveryMode && res.orderId) {
      try {
        const raw = localStorage.getItem("delivery_orders");
        const orders: { id: string; slug: string; status: string; restaurantName: string; createdAt: string }[] = raw ? JSON.parse(raw) : [];
        orders.unshift({
          id: res.orderId,
          slug: restaurant.slug,
          status: "pending",
          restaurantName: restaurant.name,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("delivery_orders", JSON.stringify(orders));
        localStorage.removeItem("delivery_cart_slug");
        window.dispatchEvent(new Event("orders:updated"));
      } catch { /* ignore */ }
    }
    fetch("/api/orders/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: res.orderId }),
    }).catch(() => {});
    router.push(`/r/${restaurant.slug}/order/${res.orderId}?${locationParam}`);
  };

  const subtotal = cartTotal(items);
  const total = subtotal + (deliveryMode ? deliveryFee : 0);

  return (
    <main className={`min-h-screen bg-stone-50 ${deliveryMode ? "pb-24" : "pb-40"}`}>
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            href={deliveryMode ? "/commander" : `/r/${restaurant.slug}?${locationParam}`}
            className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              Votre panier
            </h1>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {restaurant.name} · {locationLabel}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {items.length === 0 ? (
          <div className="mt-16 text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-10 h-10 text-stone-400" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-1">
              Panier vide
            </h2>
            <p className="text-stone-500 mb-6">
              Ajoutez des plats depuis le menu.
            </p>
            <Link
              href={deliveryMode ? "/commander" : `/r/${restaurant.slug}?${locationParam}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#722F37] text-white px-6 py-3 font-semibold hover:bg-[#5a2530] transition-colors"
            >
              ← {deliveryMode ? "Retour à la marketplace" : "Retour au menu"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-stone-200/80"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-sm text-stone-500 mt-0.5">
                    {formatFCFA(item.price)} l'unité
                  </div>
                  <div className="text-sm font-semibold text-stone-900 mt-1">
                    {formatFCFA(item.price * item.quantity)}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
                  <button
                    onClick={() => changeQty(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-white text-stone-700 shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center"
                    aria-label="Diminuer"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-semibold text-stone-900 text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => changeQty(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-[#722F37] text-white hover:bg-[#5a2530] transition-colors flex items-center justify-center"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery form */}
        {deliveryMode && items.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-stone-200 p-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-[#722F37]" />
              <h3 className="font-semibold text-stone-900 text-sm">Informations de livraison</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1 block">
                  Téléphone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="Ex: 07 XX XX XX XX"
                    className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1 block">
                  Quartier *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={deliveryQuartier}
                    onChange={(e) => setDeliveryQuartier(e.target.value)}
                    placeholder="Ex: Cocody, Riviera 2"
                    className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1 block">
                  Carrefour / Point de repère *
                </label>
                <input
                  type="text"
                  value={deliveryCarrefour}
                  onChange={(e) => setDeliveryCarrefour(e.target.value)}
                  placeholder="Ex: Carrefour Palmeraie, à côté de..."
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                />
              </div>
            </div>

            {deliveryFee > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <span className="text-xs text-stone-500">Frais de livraison</span>
                <span className="text-sm font-semibold text-stone-700">{formatFCFA(deliveryFee)}</span>
              </div>
            )}
          </div>
        )}

        {stockIssues.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden />
              <span className="text-sm font-semibold text-red-700">Stock insuffisant</span>
            </div>
            <ul className="space-y-1.5">
              {stockIssues.map((issue) => (
                <li key={issue.name} className="text-sm text-red-700">
                  <span className="font-medium">{issue.name}</span> — vous en demandez {issue.requested}, il n&apos;en reste que{" "}
                  <span className="font-bold">{issue.available}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-500 mt-2">Réduisez les quantités ci-dessus puis réessayez.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2 animate-fade-in-up">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className={`fixed inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-30 ${deliveryMode ? "bottom-14" : "bottom-0"}`} style={deliveryMode ? { paddingBottom: "env(safe-area-inset-bottom, 0px)" } : undefined}>
          <div className="max-w-2xl mx-auto px-5 py-3">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-stone-500 uppercase tracking-wider font-medium">
                Total
              </span>
              <span className="text-2xl font-bold text-stone-900 tracking-tight">
                {formatFCFA(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={checkStock}
              disabled={submitting || checkingStock}
              className="w-full rounded-2xl bg-[#722F37] text-white font-bold text-base py-4 hover:bg-[#5a2530] active:scale-[0.98] transition-all shadow-lg shadow-[#722F37]/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {checkingStock ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Vérification…</>
              ) : (
                <>Commander · {formatFCFA(total)}</>
              )}
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !submitting && setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm mx-auto p-6 pb-8 animate-fade-in-up">
            <h2 className="text-lg font-bold text-stone-900 text-center mb-1">
              Confirmer votre commande ?
            </h2>
            <p className="text-sm text-stone-500 text-center mb-5">
              {locationLabel} · {items.reduce((s, i) => s + i.quantity, 0)} article{items.length > 1 ? "s" : ""}
            </p>
            {deliveryMode && (
              <div className="text-left bg-stone-50 rounded-xl p-3 mb-4 text-xs text-stone-600 space-y-1">
                <div><span className="font-semibold">Tél :</span> {deliveryPhone}</div>
                <div><span className="font-semibold">Quartier :</span> {deliveryQuartier}</div>
                <div><span className="font-semibold">Repère :</span> {deliveryCarrefour}</div>
                {deliveryFee > 0 && (
                  <div><span className="font-semibold">Livraison :</span> {formatFCFA(deliveryFee)}</div>
                )}
              </div>
            )}
            <div className="text-center text-3xl font-bold text-stone-900 mb-6">
              {formatFCFA(total)}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl bg-[#722F37] text-white font-bold text-base py-4 hover:bg-[#5a2530] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirmer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
              className="w-full mt-3 rounded-2xl bg-stone-100 text-stone-700 font-medium text-sm py-3 hover:bg-stone-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {deliveryMode && <DeliveryNav activeTab="cart" />}
    </main>
  );
}
