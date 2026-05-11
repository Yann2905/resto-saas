"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (pathname === "/admin/login") return;
    if (!user) {
      router.replace("/admin/login");
      return;
    }
    if (role !== "superadmin") {
      router.replace("/admin/login");
    }
  }, [loading, user, role, pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100">
        <div className="flex items-center gap-3 text-stone-400">
          <span className="w-5 h-5 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
          Vérification des droits…
        </div>
      </main>
    );
  }

  if (!user || role !== "superadmin") {
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

  return <>{children}</>;
}
