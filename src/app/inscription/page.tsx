"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ChefHat, Hotel, Loader2 } from "lucide-react";

export default function InscriptionPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Abidjan");
  const [type, setType] = useState<"restaurant" | "hotel">("restaurant");
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string; slug: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptCgu) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, ownerName, email, phone, city, type }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Erreur lors de la création.");
        setSubmitting(false);
        return;
      }
      setResult({ email: json.email, password: json.password, slug: json.slug });
    } catch {
      setError("Erreur réseau. Réessayez.");
    }
    setSubmitting(false);
  };

  if (result) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Restaurant créé !</h1>
          <p className="text-sm text-stone-600 mb-6">
            Votre espace est prêt. Voici vos identifiants de connexion :
          </p>

          <div className="bg-stone-50 rounded-2xl p-5 mb-6 text-left space-y-3 border border-stone-200">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Email</span>
              <div className="font-mono text-sm text-stone-900 mt-0.5">{result.email}</div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Mot de passe</span>
              <div className="font-mono text-sm text-stone-900 mt-0.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">{result.password}</div>
            </div>
          </div>

          <p className="text-xs text-red-600 font-semibold mb-6 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
            Notez bien votre mot de passe, il ne sera plus affiché.
          </p>

          <Link
            href="/dashboard/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#722F37] text-white px-8 py-3.5 font-bold hover:bg-[#5a2530] transition-colors shadow-lg"
          >
            Accéder au tableau de bord
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-[11px] text-stone-400 mt-4">
            Essai gratuit de 14 jours · Plan Starter
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex justify-center mb-4">
            <Image src="/icon-192.png" alt="Resto SaaS" width={56} height={56} className="rounded-2xl shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Rejoignez Resto SaaS</h1>
          <p className="text-sm text-stone-500 mt-1">
            Créez votre espace en 30 secondes — essai gratuit 14 jours
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 space-y-4">
          {/* Nom restaurant */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Nom du restaurant</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
              placeholder="Ex: Chez Maman Adjoua"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] focus:outline-none transition"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-2 block">Type d&apos;établissement</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("restaurant")}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${
                  type === "restaurant"
                    ? "border-[#722F37] bg-[#722F37]/5"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <ChefHat className={`w-6 h-6 ${type === "restaurant" ? "text-[#722F37]" : "text-stone-400"}`} />
                <span className={`text-xs font-semibold ${type === "restaurant" ? "text-[#722F37]" : "text-stone-600"}`}>Restaurant</span>
              </button>
              <button
                type="button"
                onClick={() => setType("hotel")}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${
                  type === "hotel"
                    ? "border-[#722F37] bg-[#722F37]/5"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <Hotel className={`w-6 h-6 ${type === "hotel" ? "text-[#722F37]" : "text-stone-400"}`} />
                <span className={`text-xs font-semibold ${type === "hotel" ? "text-[#722F37]" : "text-stone-600"}`}>Hôtel</span>
              </button>
            </div>
          </div>

          {/* Propriétaire */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Nom du propriétaire</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              placeholder="Ex: Konan Yao"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] focus:outline-none transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] focus:outline-none transition"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Ex: 0575343846"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] focus:outline-none transition"
            />
          </div>

          {/* Ville */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Ville</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Abidjan"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] focus:outline-none transition"
            />
          </div>

          {/* CGU */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptCgu}
              onChange={(e) => setAcceptCgu(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#722F37] focus:ring-[#722F37]"
            />
            <span className="text-xs text-stone-600">
              J&apos;accepte les{" "}
              <Link href="/cgu" className="text-[#722F37] font-semibold hover:underline" target="_blank">
                conditions d&apos;utilisation
              </Link>
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#722F37] text-white font-bold py-3.5 shadow-lg shadow-[#722F37]/20 hover:bg-[#5a2530] disabled:bg-stone-400 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création en cours…
              </>
            ) : (
              <>
                Créer mon restaurant
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-stone-400 mt-6">
          Déjà inscrit ?{" "}
          <Link href="/dashboard/login" className="text-[#722F37] font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
