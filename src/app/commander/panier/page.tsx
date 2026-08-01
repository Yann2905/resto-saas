"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import DeliveryNav from "@/app/commander/_components/delivery-nav";

function getDeliveryCartInfo(): { count: number; slug: string | null } {
  if (typeof window === "undefined") return { count: 0, slug: null };
  let total = 0;
  let slug: string | null = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes(":delivery")) {
      try {
        const items = JSON.parse(localStorage.getItem(key) ?? "[]");
        for (const item of items) total += item.quantity ?? 1;
        if (items.length > 0 && !slug) {
          slug = localStorage.getItem("delivery_cart_slug");
        }
      } catch { /* ignore */ }
    }
  }
  return { count: total, slug };
}

export default function PanierPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const info = getDeliveryCartInfo();
    if (info.count > 0 && info.slug) {
      router.replace(`/r/${info.slug}/cart?mode=delivery`);
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <main className="min-h-screen bg-stone-50 pb-24">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            href="/commander"
            className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Votre panier
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="mt-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-10 h-10 text-stone-400" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">
            Panier vide
          </h2>
          <p className="text-stone-500 mb-6">
            Parcourez les restaurants et ajoutez des plats.
          </p>
          <Link
            href="/commander"
            className="inline-flex items-center gap-2 rounded-full bg-[#722F37] text-white px-6 py-3 font-semibold hover:bg-[#5a2530] transition-colors"
          >
            ← Voir les restaurants
          </Link>
        </div>
      </div>

      <DeliveryNav activeTab="cart" />
    </main>
  );
}
