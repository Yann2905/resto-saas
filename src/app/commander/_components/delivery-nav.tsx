"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, ShoppingBag } from "lucide-react";

type Props = {
  cartCount?: number;
  ordersCount?: number;
  activeTab?: "home" | "cart" | "orders";
};

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
          const cartSlug = localStorage.getItem("delivery_cart_slug");
          if (cartSlug) slug = cartSlug;
        }
      } catch { /* ignore */ }
    }
  }
  return { count: total, slug };
}

function getPendingOrdersCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("delivery_orders");
    if (!raw) return 0;
    const orders = JSON.parse(raw) as { id: string; status: string }[];
    return orders.filter((o) => o.status !== "served").length;
  } catch { return 0; }
}

export default function DeliveryNav({ cartCount: propCount, ordersCount: propOrdersCount, activeTab: propActive }: Props) {
  const pathname = usePathname();
  const [cartInfo, setCartInfo] = useState({ count: propCount ?? 0, slug: null as string | null });
  const [ordersCount, setOrdersCount] = useState(propOrdersCount ?? 0);

  const active = propActive ?? (
    pathname.includes("/cart") ? "cart"
    : pathname === "/commander/commandes" || pathname.includes("/order") ? "orders"
    : "home"
  );

  const refresh = useCallback(() => {
    if (propCount === undefined) {
      setCartInfo(getDeliveryCartInfo());
    }
    if (propOrdersCount === undefined) {
      setOrdersCount(getPendingOrdersCount());
    }
  }, [propCount, propOrdersCount]);

  useEffect(() => {
    if (propCount !== undefined) {
      setCartInfo((prev) => ({ ...prev, count: propCount }));
    }
  }, [propCount]);

  useEffect(() => {
    if (propOrdersCount !== undefined) {
      setOrdersCount(propOrdersCount);
    }
  }, [propOrdersCount]);

  useEffect(() => {
    refresh();
    window.addEventListener("cart:updated", refresh);
    window.addEventListener("orders:updated", refresh);
    return () => {
      window.removeEventListener("cart:updated", refresh);
      window.removeEventListener("orders:updated", refresh);
    };
  }, [refresh]);

  const cartHref = cartInfo.count > 0 && cartInfo.slug
    ? `/r/${cartInfo.slug}/cart?mode=delivery`
    : "/commander";

  const tabs: { key: string; label: string; icon: typeof Home; href: string; badge?: number }[] = [
    { key: "home", label: "Accueil", icon: Home, href: "/commander" },
    { key: "cart", label: "Panier", icon: ShoppingBag, href: cartHref, badge: cartInfo.count },
    { key: "orders", label: "Commandes", icon: Receipt, href: "/commander/commandes", badge: ordersCount },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-3xl mx-auto flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
                isActive ? "text-[#722F37]" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-[#722F37] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? "text-[#722F37]" : ""}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-2 w-5 h-0.5 rounded-full bg-[#722F37]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
