"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const pathname = usePathname();

  const authorized = role === "superadmin";

  // On bloque uniquement pendant le loading initial ET si on n'a pas
  // encore de rôle. Dès que le cache fournit role=superadmin, on passe.
  const verifying = loading && !authorized;

  useEffect(() => {
    if (verifying) return;
    if (pathname === "/admin/login") return;
    if (!authorized) {
      window.location.href = "/admin/login";
    }
  }, [verifying, authorized, pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  if (authorized) return <>{children}</>;

  if (verifying) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100">
        <div className="flex items-center gap-3 text-stone-400">
          <span className="w-5 h-5 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
          Vérification des droits…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 p-6 text-center">
      <div>
        <Lock className="w-12 h-12 mx-auto mb-3 text-amber-400" aria-hidden />
        <p className="font-semibold">Accès réservé</p>
        <p className="text-sm text-stone-400 mt-1">
          Redirection vers la page de connexion…
        </p>
      </div>
    </main>
  );
}
