"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const TABS = [
  { href: "/dashboard/orders", label: "Commandes", icon: "📋" },
  { href: "/dashboard/menu", label: "Menu", icon: "🍽" },
  { href: "/dashboard/qrcodes", label: "QR codes", icon: "📱" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, restaurant } = useAuth();

  if (pathname === "/dashboard/login" || !user || !restaurant) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/dashboard/login");
  };

  return (
    <>
      {/* Top bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-base sm:text-lg flex-shrink-0">
              {restaurant.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-tight truncate">
                {restaurant.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-stone-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tableau de bord
              </p>
            </div>
          </div>

          {/* Tabs desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100 rounded-full p-1">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <span className="mr-1.5" aria-hidden>
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 rounded-full px-3 sm:px-4 py-2 hover:bg-stone-100 transition-colors"
            aria-label="Déconnexion"
          >
            <span className="hidden sm:inline">Déconnexion</span>
            <span aria-hidden className="text-base">↪</span>
          </button>
        </div>
      </header>

      {/* Bottom tab bar mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-stone-900"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-amber-500" />
                )}
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
