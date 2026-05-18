"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Smartphone,
  Check,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Sparkles,
  Phone,
  CheckCircle,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { PLANS, computeNewExpiry, type Plan } from "@/lib/payment-plans";
import { useAuth } from "@/lib/auth-context";
import type { PaymentMethod } from "@/types";

/* ── Moyens de paiement ─────────────────────────────────────── */
type MethodOption = {
  key: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
  disabledLabel?: string;
  merchantPhone?: string;
};

const METHODS: MethodOption[] = [
  {
    key: "wave",
    label: "Wave",
    icon: <Smartphone className="w-6 h-6" />,
    color: "from-blue-400 to-blue-600",
    merchantPhone: "0575343846",
  },
  {
    key: "orange_money",
    label: "Orange Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "from-orange-400 to-orange-600",
    merchantPhone: "0708945821",
  },
  {
    key: "mtn_money",
    label: "MTN Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "from-yellow-300 to-amber-500",
    merchantPhone: "0575343846",
  },
  {
    key: "mobile_money",
    label: "Moov Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "from-green-400 to-green-600",
    disabled: true,
    disabledLabel: "Bientôt disponible",
  },
  {
    key: "carte_bancaire",
    label: "Carte bancaire",
    icon: <CreditCard className="w-6 h-6" />,
    color: "from-violet-400 to-violet-600",
    disabled: true,
    disabledLabel: "Bientôt disponible",
  },
];

/* ── Steps ──────────────────────────────────────────────────── */
type Step = "method" | "phone" | "plan" | "processing" | "waiting" | "success" | "error";

type Props = {
  token: string;
  restaurantName: string;
  currentExpiry: string | null;
};

export default function PaymentClient({
  token,
  restaurantName,
  currentExpiry,
}: Props) {
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payerPhone, setPayerPhone] = useState("");
  const [error, setError] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [declaring, setDeclaring] = useState(false);

  // Redirection vers login si pas connecté
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = `/payment/${token}`;
      window.location.replace(
        `/dashboard/login?next=${encodeURIComponent(currentPath)}`,
      );
    }
  }, [loading, user, token]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          Vérification...
        </div>
      </main>
    );
  }

  const isExpired = currentExpiry && new Date(currentExpiry) < new Date();
  const expiryLabel = currentExpiry
    ? new Date(currentExpiry).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Non définie";

  /* ── Choix méthode → aller au numéro ─────────────────────── */
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("phone");
  };

  /* ── Valider le numéro → aller aux plans ─────────────────── */
  const handlePhoneSubmit = () => {
    const cleaned = payerPhone.replace(/\s/g, "");
    if (cleaned.length < 8) return;
    setStep("plan");
  };

  /* ── Initier le paiement ─────────────────────────────────── */
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
          method: selectedMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }

      setPaymentRef(data.reference);
      setStep("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("error");
    }
  };

  /* ── J'ai payé → déclarer et activer immédiatement ──────── */
  const handleDeclare = async () => {
    if (!paymentRef) return;
    setDeclaring(true);
    setError("");

    try {
      const res = await fetch("/api/payment/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: paymentRef,
          phone: payerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur lors de la confirmation");
      }

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("error");
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
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
              <p
                className={`text-sm font-semibold ${
                  isExpired ? "text-red-800" : "text-emerald-800"
                }`}
              >
                {isExpired ? "Abonnement expiré" : "Abonnement actif"}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isExpired ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {isExpired
                  ? `Expiré depuis le ${expiryLabel}`
                  : `Expire le ${expiryLabel}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── STEP 1: Choix moyen de paiement ──────────────────── */}
        {step === "method" && (
          <section className="animate-fade-in-up">
            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Choisissez votre moyen de paiement
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              Sélectionnez comment vous souhaitez payer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => !m.disabled && handleMethodSelect(m.key)}
                  disabled={m.disabled}
                  className={`group relative bg-white rounded-2xl border p-5 flex flex-col items-center gap-3 text-center transition-all ${
                    m.disabled
                      ? "border-stone-100 opacity-50 cursor-not-allowed"
                      : "border-stone-200 hover:border-stone-400 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shadow-sm ${m.disabled ? "grayscale" : ""}`}
                  >
                    {m.icon}
                  </div>
                  <span className="text-sm font-semibold text-stone-800">
                    {m.label}
                  </span>
                  {m.disabled && m.disabledLabel && (
                    <span className="text-[10px] text-stone-400 -mt-2">
                      {m.disabledLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── STEP 2: Numéro de téléphone ──────────────────────── */}
        {step === "phone" && (
          <section className="animate-fade-in-up">
            <button
              onClick={() => setStep("method")}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Changer de moyen de paiement
            </button>

            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Votre numéro de paiement
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              Entrez le numéro{" "}
              <span className="font-semibold text-stone-700">
                {METHODS.find((m) => m.key === selectedMethod)?.label}
              </span>{" "}
              qui sera débité.
            </p>

            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${METHODS.find((m) => m.key === selectedMethod)?.color} flex items-center justify-center text-white`}>
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {METHODS.find((m) => m.key === selectedMethod)?.label}
                  </p>
                  <p className="text-xs text-stone-500">
                    Numéro qui sera débité
                  </p>
                </div>
              </div>

              <input
                type="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="Ex: 07 58 74 33 42"
                className="w-full rounded-xl border border-stone-300 px-4 py-3.5 text-base text-center font-semibold tracking-wider focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 placeholder:text-stone-400 placeholder:font-normal placeholder:tracking-normal"
                autoFocus
              />

              <button
                onClick={handlePhoneSubmit}
                disabled={payerPhone.replace(/\s/g, "").length < 8}
                className="w-full mt-4 rounded-full bg-stone-900 text-white px-5 py-3 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 transition-colors"
              >
                Continuer
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 3: Choix du forfait ─────────────────────────── */}
        {step === "plan" && (
          <section className="animate-fade-in-up">
            <button
              onClick={() => setStep("phone")}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Modifier le numéro
            </button>

            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Choisissez votre forfait
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              <span className="font-semibold text-stone-700">
                {METHODS.find((m) => m.key === selectedMethod)?.label}
              </span>
              {" · "}
              <span className="font-mono text-stone-700">{payerPhone}</span>
            </p>

            <div className="space-y-3">
              {PLANS.map((plan) => {
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
                        ? "border-amber-400 shadow-md shadow-amber-100"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
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
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                            : "bg-stone-900 hover:bg-stone-800"
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

        {/* ── STEP 4: Processing (initiation en cours) ──────────── */}
        {step === "processing" && (
          <section className="animate-fade-in-up text-center py-16">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-stone-900 mb-1">
              Préparation du paiement...
            </h2>
            <p className="text-sm text-stone-500">
              {selectedPlan && (
                <>
                  {formatFCFA(selectedPlan.price)} — {selectedPlan.label}
                </>
              )}
            </p>
          </section>
        )}

        {/* ── STEP 5: En attente — l'utilisateur doit payer puis confirmer */}
        {step === "waiting" && selectedPlan && (
          <section className="animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-amber-300 shadow-md shadow-amber-100 p-6">
              {/* Instruction */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-stone-900 mb-2">
                  Effectuez le paiement
                </h2>
                <p className="text-sm text-stone-600">
                  Envoyez <span className="font-bold text-stone-900">{formatFCFA(selectedPlan.price)}</span> via{" "}
                  <span className="font-bold text-stone-900">
                    {METHODS.find((m) => m.key === selectedMethod)?.label}
                  </span>
                </p>
              </div>

              {/* Récap */}
              <div className="bg-stone-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Forfait</span>
                  <span className="font-semibold text-stone-900">{selectedPlan.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Montant</span>
                  <span className="font-bold text-stone-900">{formatFCFA(selectedPlan.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Votre numéro</span>
                  <span className="font-mono text-stone-900">{payerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Référence</span>
                  <span className="font-mono text-stone-900">{paymentRef}</span>
                </div>
              </div>

              {/* Instructions étapes */}
              {(() => {
                const method = METHODS.find((m) => m.key === selectedMethod);
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-xs font-semibold text-blue-800 mb-2">Comment payer :</p>
                    <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                      <li>Ouvrez votre application <span className="font-bold">{method?.label}</span></li>
                      <li>
                        Envoyez <span className="font-bold">{formatFCFA(selectedPlan.price)}</span> au{" "}
                        <span className="font-bold font-mono">{method?.merchantPhone}</span>
                      </li>
                      <li>Une fois le transfert effectué, revenez ici</li>
                      <li>Cliquez sur <span className="font-bold text-emerald-700">&quot;J&apos;ai payé&quot;</span></li>
                    </ol>
                  </div>
                );
              })()}

              {/* Bouton J'ai payé */}
              <button
                onClick={handleDeclare}
                disabled={declaring}
                className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 text-base font-bold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                {declaring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    J&apos;ai payé
                  </>
                )}
              </button>

              <p className="text-[10px] text-stone-400 text-center mt-3">
                Votre abonnement sera activé immédiatement après confirmation.
              </p>
            </div>

            {/* Bouton retour */}
            <button
              onClick={() => {
                setStep("plan");
                setPaymentRef("");
              }}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mt-4 transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Changer de forfait
            </button>
          </section>
        )}

        {/* ── STEP 6: Succès ───────────────────────────────────── */}
        {step === "success" && (
          <section className="animate-fade-in-up text-center py-16">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Abonnement activé !
            </h2>
            <p className="text-sm text-stone-500 mb-4">
              Votre abonnement a été rechargé avec succès.
            </p>
            {selectedPlan && (
              <div className="inline-block bg-white rounded-2xl border border-stone-200 p-5 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-stone-500">Forfait</span>
                    <span className="font-semibold text-stone-900">
                      {selectedPlan.label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-stone-500">Montant</span>
                    <span className="font-semibold text-stone-900">
                      {formatFCFA(selectedPlan.price)}
                    </span>
                  </div>
                  {paymentRef && (
                    <div className="flex justify-between gap-8">
                      <span className="text-stone-500">Référence</span>
                      <span className="font-mono text-stone-900">
                        {paymentRef}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8">
                    <span className="text-stone-500">Nouvelle expiration</span>
                    <span className="font-semibold text-emerald-600">
                      {computeNewExpiry(
                        currentExpiry,
                        selectedPlan.months,
                      ).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs text-stone-400 mt-4">
              Un SMS de confirmation vous sera envoyé.
            </p>
          </section>
        )}

        {/* ── STEP: Erreur ───────────────────────────────────── */}
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
              className="rounded-full bg-stone-900 text-white px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              Réessayer
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
