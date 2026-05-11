"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role === "superadmin") {
      router.replace("/admin");
    }
  }, [authLoading, user, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user) {
        throw authError ?? new Error("Erreur d'authentification");
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile || profile.role !== "superadmin") {
        await supabase.auth.signOut();
        setError("Ce compte n'est pas un super-administrateur.");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.22),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(239,68,68,0.08),_transparent_50%)]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 shadow-lg shadow-amber-900/40">
            R
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-stone-950" />
          </div>
          <div>
            <span className="font-semibold tracking-tight block leading-tight">
              Resto SaaS
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Super-admin
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-stone-800 bg-stone-900/70 backdrop-blur p-7 shadow-2xl shadow-black/40 space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Zone restreinte
              <Lock className="w-5 h-5 text-amber-400" aria-hidden />
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Accès réservé aux administrateurs de la plateforme.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restosaas.com"
              className="w-full rounded-xl border border-stone-700 bg-stone-950/60 px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-300 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-700 bg-stone-950/60 px-4 py-3 pr-12 text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-stone-400 hover:text-amber-400 active:text-amber-500 transition-colors touch-manipulation"
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
            <div className="flex items-start gap-2 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300 animate-fade-in-up">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-semibold py-3.5 shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-500 disabled:from-stone-600 disabled:to-stone-700 disabled:text-stone-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                Connexion…
              </>
            ) : (
              <>
                Accéder à la console <ArrowRight className="w-4 h-4" aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          Vous êtes un restaurant ?{" "}
          <a
            href="/dashboard/login"
            className="text-stone-300 hover:text-white underline underline-offset-4"
          >
            Connexion restaurant
          </a>
        </p>
      </div>
    </main>
  );
}
