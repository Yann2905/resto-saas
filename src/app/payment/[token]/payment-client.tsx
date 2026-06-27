"use client";

import { useEffect, useState } from "react";
import {
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { getPlansByTier, getTierLabel, computeNewExpiry, type Plan, type PlanTier } from "@/lib/payment-plans";

type Step = "plan" | "processing" | "success" | "error";

type Props = {
  token: string;
  restaurantName: string;
  currentExpiry: string | null;
  planTier: PlanTier;
  isPartner?: boolean;
};

export default function PaymentClient({
  token,
  restaurantName,
  currentExpiry,
  planTier,
  isPartner = false,
}: Props) {
  const tierPlans = getPlansByTier(planTier, isPartner);
  const tierLabel = getTierLabel(planTier);
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      setStep("success");
    } else if (status === "error") {
      setError("Le paiement n'a pas abouti. Veuillez réessayer.");
      setStep("error");
    }
  }, []);

  const isExpired = currentExpiry && new Date(currentExpiry) < new Date();
  const expiryLabel = currentExpiry
    ? new Date(currentExpiry).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }) +
      " à " +
      new Date(currentExpiry).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Non définie";

  const handlePay = async (plan: Plan) => {
    setSelectedPlan(plan);
    setStep("processing");
    setError("");

    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          planKey: plan.key,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }

      setPaymentRef(data.reference);

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("Aucune URL de paiement reçue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-[#faf6ef]/30 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center text-white font-bold text-lg">
            {restaurantName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900">
              {restaurantName}
            </h1>
            <p className="text-xs text-stone-500">Rechargement d&apos;abonnement</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Partner badge */}
        {isPartner && (
          <div className="flex items-center gap-2 rounded-xl bg-[#C8963E]/10 border border-[#C8963E]/30 px-4 py-3 mb-4">
            <span className="text-lg">🤝</span>
            <span className="text-sm font-semibold text-[#C8963E]">
              Partenaire Resto SaaS — tarif -50%
            </span>
          </div>
        )}

        {/* Status card */}
        <div
          className={`rounded-2xl border p-5 mb-6 ${
            isExpired
              ? "bg-red-50 border-red-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {isExpired ? (
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-semibold ${isExpired ? "text-red-800" : "text-emerald-800"}`}>
                {isExpired ? "Abonnement expiré" : "Abonnement actif"}
              </p>
              <p className={`text-xs mt-0.5 ${isExpired ? "text-red-600" : "text-emerald-600"}`}>
                {isExpired ? `Expiré depuis le ${expiryLabel}` : `Expire le ${expiryLabel}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Choix du forfait ─────────────────────────────────── */}
        {step === "plan" && (
          <section className="animate-fade-in-up">
            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Rechargement — Formule {tierLabel}
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              Choisissez la durée. Vous serez redirigé vers le paiement sécurisé.
            </p>

            <div className="space-y-3">
              {tierPlans.map((plan) => {
                const newExpiry = computeNewExpiry(currentExpiry, plan.months);
                const newExpiryLabel = newExpiry.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div
                    key={plan.key}
                    className={`relative bg-white rounded-2xl border p-5 transition-all ${
                      plan.popular
                        ? "border-[#C8963E] shadow-md shadow-[#C8963E]/20"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-5 bg-gradient-to-r from-[#C8963E] to-[#a07832] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Populaire
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-stone-900">
                          {plan.label}
                        </h3>
                        <p className="text-2xl font-extrabold text-stone-900 mt-1">
                          {formatFCFA(plan.price)}
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                          {formatFCFA(plan.pricePerMonth)} / mois
                          {plan.saving > 0 && (
                            <span className="ml-2 text-emerald-600 font-semibold">
                              Économisez {formatFCFA(plan.saving)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                          Nouvelle expiration : {newExpiryLabel}
                        </p>
                      </div>

                      <button
                        onClick={() => handlePay(plan)}
                        className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                          plan.popular
                            ? "bg-gradient-to-r from-[#C8963E] to-[#a07832] hover:from-[#a07832] hover:to-[#8a6828] shadow-md"
                            : "bg-[#722F37] hover:bg-[#5a2530]"
                        }`}
                      >
                        Payer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Redirection vers Genius Pay ──────────────────────── */}
        {step === "processing" && (
          <section className="animate-fade-in-up text-center py-16">
            <span className="w-12 h-12 border-4 border-[#e0c07a] border-t-[#C8963E] rounded-full animate-spin mx-auto mb-4 block" />
            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Redirection vers le paiement...
            </h2>
            <p className="text-sm text-stone-500">
              Vous allez être redirigé vers la page de paiement sécurisée.
            </p>
          </section>
        )}

        {/* ── Succès ──────────────────────────────────────────── */}
        {step === "success" && (
          <section className="animate-fade-in-up text-center py-16">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Paiement reçu !
            </h2>
            <p className="text-sm text-stone-500 mb-4">
              Votre abonnement sera activé automatiquement dans quelques instants.
            </p>
            {selectedPlan && (
              <div className="inline-block bg-white rounded-2xl border border-stone-200 p-5 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-stone-500">Forfait</span>
                    <span className="font-semibold text-stone-900">{selectedPlan.label}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-stone-500">Montant</span>
                    <span className="font-semibold text-stone-900">{formatFCFA(selectedPlan.price)}</span>
                  </div>
                  {paymentRef && (
                    <div className="flex justify-between gap-8">
                      <span className="text-stone-500">Référence</span>
                      <span className="font-mono text-stone-900">{paymentRef}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-stone-400 mt-4">
              Un SMS de confirmation vous sera envoyé.
            </p>
          </section>
        )}

        {/* ── Erreur ──────────────────────────────────────────── */}
        {step === "error" && (
          <section className="animate-fade-in-up text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Échec du paiement
            </h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => setStep("plan")}
              className="rounded-full bg-[#722F37] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
            >
              Réessayer
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
