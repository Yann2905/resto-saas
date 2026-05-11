"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SIGNIN_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} : délai dépassé`)), ms)
    ),
  ]);
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-redirect si déjà connecté (synchrone, depuis le cache localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("resto-saas:auth-v1");
      if (!raw) return;
      const cache = JSON.parse(raw) as {
        role?: string;
        restaurant?: unknown;
      };
      if (cache.role === "superadmin") {
        window.location.replace("/admin");
      } else if (cache.role === "owner" && cache.restaurant) {
        window.location.replace("/dashboard/orders");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      try {
        localStorage.removeItem("resto-saas:auth-v1");
      } catch {
        /* ignore */
      }

      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SIGNIN_TIMEOUT_MS,
        "Connexion"
      );

      if (authError || !data?.user) {
        throw authError ?? new Error("Email ou mot de passe incorrect");
      }

      // Détermine la destination via le profile. Si la requête est trop lente,
      // on navigue par défaut vers /dashboard/orders (le DashboardGuard / page
      // gérera s'il manque le restaurant).
      let destination = "/dashboard/orders";
      try {
        const profileRes = await withTimeout(
          Promise.resolve(
            supabase
              .from("profiles")
              .select("role, restaurant_id")
              .eq("id", data.user.id)
              .maybeSingle()
          ),
          PROFILE_TIMEOUT_MS,
          "Vérification du profil"
        );
        const profile = profileRes.data as {
          role?: string;
          restaurant_id?: string | null;
        } | null;
        if (profile?.role === "superadmin") destination = "/admin";
        else if (profile?.role === "owner" && profile?.restaurant_id)
          destination = "/dashboard/orders";
        else if (profile) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          throw new Error("Aucun restaurant n'est associé à ce compte.");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Aucun restaurant")) {
          throw e;
        }
        console.warn("[dashboard-login] profile check skipped (slow):", e);
      }

      window.location.replace(destination);
    } catch (err) {
      console.error("[dashboard-login]", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Email ou mot de passe incorrect"
      );
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-stone-50 p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.08),_transparent_50%)]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 shadow-lg shadow-amber-900/20">
            R
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-stone-50" />
          </div>
          <div>
            <span className="font-semibold tracking-tight block leading-tight text-stone-900">
              Resto SaaS
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Espace restaurant
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Bon retour
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Connectez-vous pour gérer votre restaurant.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@restaurant.com"
              autoComplete="email"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 pr-12 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-stone-400 hover:text-stone-900 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-fade-in-up">
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                aria-hidden
              />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-stone-900 text-white font-semibold py-3.5 shadow-lg shadow-stone-900/10 hover:bg-stone-800 disabled:bg-stone-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connexion…
              </>
            ) : (
              <>
                Se connecter <ArrowRight className="w-4 h-4" aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          Pas de compte ? Contactez l&apos;administrateur pour créer un compte
          propriétaire.
        </p>
      </div>
    </main>
  );
}
