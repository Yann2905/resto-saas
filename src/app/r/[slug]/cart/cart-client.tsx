"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem } from "@/types";
import {
  cartTotal,
  clearCart,
  getCart,
  updateQuantity,
} from "@/lib/cart";
import { formatFCFA } from "@/lib/format";
import { createOrder } from "@/lib/orders";

type Props = {
  restaurant: { id: string; name: string; slug: string };
  tableNumber: number;
};

export default function CartClient({ restaurant, tableNumber }: Props) {
  const router = useRouter();
  const tableKey = String(tableNumber);
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(getCart(restaurant.id, tableKey));
    const refresh = () => setItems(getCart(restaurant.id, tableKey));
    window.addEventListener("cart:updated", refresh);
    return () => window.removeEventListener("cart:updated", refresh);
  }, [restaurant.id, tableKey]);

  const changeQty = (productId: string, qty: number) => {
    updateQuantity(restaurant.id, tableKey, productId, qty);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await createOrder(restaurant.id, tableNumber, items);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clearCart(restaurant.id, tableKey);
    router.push(`/r/${restaurant.slug}/order/${res.orderId}?table=${tableNumber}`);
  };

  const total = cartTotal(items);

  return (
    <main className="min-h-screen bg-stone-50 pb-40">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            href={`/r/${restaurant.slug}?table=${tableNumber}`}
            className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
            aria-label="Retour au menu"
          >
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              Votre commande
            </h1>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {restaurant.name} · Table {tableNumber}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {items.length === 0 ? (
          <div className="mt-16 text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5 text-4xl">
              🛒
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-1">
              Panier vide
            </h2>
            <p className="text-stone-500 mb-6">
              Ajoutez des plats depuis le menu.
            </p>
            <Link
              href={`/r/${restaurant.slug}?table=${tableNumber}`}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-6 py-3 font-semibold hover:bg-stone-800 transition-colors"
            >
              ← Retour au menu
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
                    className="w-8 h-8 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center justify-center"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2 animate-fade-in-up">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200">
          <div className="max-w-2xl mx-auto px-5 py-4">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-stone-500 uppercase tracking-wider font-medium">
                Total
              </span>
              <span className="text-2xl font-bold text-stone-900 tracking-tight">
                {formatFCFA(total)}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-stone-900 text-white rounded-2xl py-4 font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  Valider la commande
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
