"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, ShoppingBag } from "lucide-react";

type Props = {
  cartCount?: number;
  activeTab?: "home" | "cart" | "orders";
};

export default function DeliveryNav({ cartCount: propCount, activeTab: propActive }: Props) {
  const pathname = usePathname();
  const [count, setCount] = useState(propCount ?? 0);

  const active = propActive ?? (
    pathname.includes("/cart") ? "cart" : pathname.includes("/order") ? "orders" : "home"
  );

  useEffect(() => {
    if (propCount !== undefined) {
      setCount(propCount);
      return;
    }
    const refresh = () => {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes(":delivery")) {
          try {
            const items = JSON.parse(localStorage.getItem(key) ?? "[]");
            for (const item of items) total += item.quantity ?? 1;
          } catch { /* ignore */ }
        }
      }
      setCount(total);
    };
    refresh();
    window.addEventListener("cart:updated", refresh);
    return () => window.removeEventListener("cart:updated", refresh);
  }, [propCount]);

  const tabs: { key: string; label: string; icon: typeof Home; href: string; badge?: number }[] = [
    { key: "home", label: "Accueil", icon: Home, href: "/commander" },
    { key: "cart", label: "Panier", icon: ShoppingBag, href: "/commander", badge: count },
    { key: "orders", label: "Commandes", icon: Receipt, href: "/commander" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 safe-area-pb">
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
                {tab.badge && tab.badge > 0 && (
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
      <style jsx>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}
