"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Store, LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { confirmAction } from "@/lib/swal";

type Tab = { href: string; label: string; Icon: LucideIcon; exact?: boolean };
const TABS: Tab[] = [
  { href: "/admin", label: "Vue d'ensemble", Icon: BarChart3, exact: true },
  { href: "/admin/restaurants", label: "Restaurants", Icon: Store },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  if (pathname === "/admin/login" || !user || role !== "superadmin") {
    return null;
  }

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: "Voulez-vous vraiment vous déconnecter ?",
      text: "Vous quitterez la console super-administrateur.",
      confirmText: "Se déconnecter",
    });
    if (!ok) return;
    void signOut();
    window.location.href = "/admin/login";
  };

  const isActive = (tab: Tab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <>
      <header className="bg-stone-950 text-stone-100 border-b border-stone-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 group"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-base sm:text-lg flex-shrink-0 shadow-lg shadow-amber-900/40 group-hover:scale-105 transition-transform">
              R
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-stone-950" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate flex items-center gap-2">
                Resto SaaS
                <span className="hidden sm:inline-flex items-center rounded-md bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  Admin
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-stone-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Super-administration
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-full p-1">
            {TABS.map((tab) => {
              const active = isActive(tab);
              const Icon = tab.Icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-md shadow-amber-900/30"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-stone-300 hover:text-white hover:bg-stone-900 rounded-full px-3 sm:px-4 py-2 transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.Icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-amber-400" : "text-stone-400 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-amber-400" />
                )}
                <Icon className="w-5 h-5" aria-hidden />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
