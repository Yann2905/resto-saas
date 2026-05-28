"use client";

import { useEffect, useRef, useState } from "react";

import {
  Check,
  Lightbulb,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  Lock,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  WEEK_KEYS,
  WEEK_LABELS,
  defaultOpeningHours,
} from "@/lib/opening-hours";
import { updateRestaurantHours } from "@/lib/admin";
import type { DaySchedule, OpeningHours, WeekKey } from "@/types";

export default function SettingsPage() {
  const { user, restaurant, role, loading } = useAuth();
  const [hours, setHours] = useState<OpeningHours>(defaultOpeningHours());
  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [loading, user]);

  const lastRestaurantId = useRef<string | null>(null);
  useEffect(() => {
    if (!restaurant || restaurant.id === lastRestaurantId.current) return;
    lastRestaurantId.current = restaurant.id;
    if (restaurant.openingHours) {
      setHours(restaurant.openingHours);
      setAlwaysOpen(false);
    } else {
      setHours(defaultOpeningHours());
      setAlwaysOpen(true);
    }
  }, [restaurant]);

  const updateDay = (key: WeekKey, patch: Partial<DaySchedule>) => {
    setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }));
  };

  const handleSave = async () => {
    if (!restaurant) return;
    try {
      await updateRestaurantHours(restaurant.id, alwaysOpen ? null : hours);
      setToast("Horaires enregistrés");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur");
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading || !restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          Chargement…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Réglages
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Horaires d'ouverture · gérez quand votre restaurant accepte des
            commandes.
          </p>
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900">Horaires d'ouverture</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Les commandes sont bloquées en dehors de ces créneaux.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={alwaysOpen}
                onChange={(e) => setAlwaysOpen(e.target.checked)}
                className="rounded border-stone-300 w-4 h-4"
              />
              Ouvert 24/7
            </label>
          </div>

          <div
            className={`space-y-2 transition-opacity ${
              alwaysOpen ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {WEEK_KEYS.map((k) => {
              const day = hours[k];
              return (
                <div
                  key={k}
                  className="grid grid-cols-[6rem_auto_1fr_auto_1fr] sm:grid-cols-[8rem_auto_1fr_auto_1fr] items-center gap-2 sm:gap-3 p-2 rounded-xl hover:bg-stone-50"
                >
                  <span className="font-semibold text-stone-800 text-sm">
                    {WEEK_LABELS[k]}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                    <input
                      type="checkbox"
                      checked={!day.closed}
                      onChange={(e) =>
                        updateDay(k, { closed: !e.target.checked })
                      }
                      className="rounded border-stone-300 w-4 h-4"
                    />
                    Ouvert
                  </label>
                  <input
                    type="time"
                    value={day.open}
                    disabled={day.closed}
                    onChange={(e) => updateDay(k, { open: e.target.value })}
                    className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                  <span className="text-stone-400 text-sm">→</span>
                  <input
                    type="time"
                    value={day.close}
                    disabled={day.closed}
                    onChange={(e) => updateDay(k, { close: e.target.value })}
                    className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </section>

        <p className="text-xs text-stone-500 mt-4 text-center flex items-center justify-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" aria-hidden />
          Astuce : les passages d'une journée à l'autre (ex : 18h → 02h) sont
          gérés automatiquement.
        </p>

        {/* ── Section Code PIN ─────────────────────────────────── */}
        <PinSection restaurant={restaurant} setToast={setToast} />

        {/* ── Section Abonnement ──────────────────────────────── */}
        <SubscriptionSection
          restaurant={restaurant}
          setToast={setToast}
        />
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-sm z-50 animate-fade-in-up rounded-2xl border shadow-xl backdrop-blur p-4 bg-emerald-50/95 border-emerald-200 text-emerald-900">
          <div className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <span className="flex-1">{toast}</span>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Composant Abonnement ───────────────────────────────────── */

import type { Restaurant } from "@/types";

function SubscriptionSection({
  restaurant,
  setToast,
}: {
  restaurant: Restaurant;
  setToast: (v: string | null) => void;
}) {
  const isExpired =
    restaurant.subscriptionExpiresAt &&
    new Date(restaurant.subscriptionExpiresAt) < new Date();

  const expiryLabel = restaurant.subscriptionExpiresAt
    ? new Date(restaurant.subscriptionExpiresAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Non définie";

  const handlePayNow = async () => {
    try {
      const res = await fetch("/api/payment/token", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast(data.error || "Erreur lors de la création du lien");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      window.location.href = `/payment/${data.token}`;
    } catch {
      setToast("Erreur réseau");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 mt-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4" aria-hidden />
            Abonnement
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Gérez votre abonnement et effectuez un rechargement.
          </p>
        </div>
      </div>

      {/* Statut */}
      <div
        className={`rounded-xl border p-4 mb-4 ${
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

      {/* Bouton payer */}
      <button
        onClick={handlePayNow}
        className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          isExpired
            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md"
            : "bg-stone-900 text-white hover:bg-stone-800"
        }`}
      >
        <ExternalLink className="w-4 h-4" />
        {isExpired ? "Recharger maintenant" : "Renouveler mon abonnement"}
      </button>
    </section>
  );
}

/* ── Composant Code PIN ────────────────────────────────────── */

function PinSection({
  restaurant,
  setToast,
}: {
  restaurant: Restaurant;
  setToast: (v: string | null) => void;
}) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const res = await fetch(`/api/restaurant/pin?restaurantId=${restaurant.id}`);
        const data = await res.json();
        if (data.ok && data.pin) {
          setCurrentPin(data.pin);
        }
      } catch {
        /* ignore */
      }
      setLoadingPin(false);
    };
    fetchPin();
  }, [restaurant.id]);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSavePin = async () => {
    const entered = pin.join("");
    if (entered.length !== 4) return;

    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: entered }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentPin(entered);
        setPin(["", "", "", ""]);
        sessionStorage.removeItem("resto-saas:pin-ok");
        setToast("Code PIN enregistré");
        setTimeout(() => setToast(null), 2500);
      } else {
        setToast(data.error || "Erreur");
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast("Erreur réseau");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleRemovePin = async () => {
    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: null }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentPin(null);
        sessionStorage.removeItem("resto-saas:pin-ok");
        setToast("Code PIN supprimé");
        setTimeout(() => setToast(null), 2500);
      }
    } catch {
      setToast("Erreur réseau");
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loadingPin) return null;

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 mt-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Lock className="w-4 h-4" aria-hidden />
            Code PIN
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Protégez l&apos;accès aux onglets Menu et Statistiques.
          </p>
        </div>
      </div>

      {currentPin ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  PIN actif : {currentPin.split("").map(() => "•").join(" ")}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Menu et Stats protégés
                </p>
              </div>
            </div>
            <button
              onClick={handleRemovePin}
              className="rounded-full bg-red-100 text-red-700 hover:bg-red-200 p-2 transition-colors"
              title="Supprimer le PIN"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-stone-600 mb-3">
            Définissez un code à 4 chiffres. Le serveur pourra utiliser les commandes mais pas accéder au menu ni aux stats.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-stone-300 bg-stone-50 text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-colors"
                />
              ))}
            </div>
            <button
              onClick={handleSavePin}
              disabled={pin.join("").length !== 4}
              className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 transition-colors"
            >
              Activer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
