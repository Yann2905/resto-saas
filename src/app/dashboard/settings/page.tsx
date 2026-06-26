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
import { updateRestaurantHours, updateRestaurant } from "@/lib/admin";
import { isHotelType, type DaySchedule, type OpeningHours, type WeekKey } from "@/types";

export default function SettingsPage() {
  const { user, restaurant, role, loading } = useAuth();
  const [hours, setHours] = useState<OpeningHours>(defaultOpeningHours());
  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [loading, user]);

  const lastRestaurantId = useRef<string | null>(null);
  useEffect(() => {
    if (!restaurant || restaurant.id === lastRestaurantId.current) return;
    lastRestaurantId.current = restaurant.id;
    setLowStockThreshold(restaurant.lowStockThreshold ?? 10);
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

  const handleSaveThreshold = async () => {
    if (!restaurant) return;
    setSavingThreshold(true);
    try {
      await updateRestaurant({
        restaurantId: restaurant.id,
        lowStockThreshold,
      });
      setToast("Seuil d'alerte enregistré");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSavingThreshold(false);
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
                    className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                  <span className="text-stone-400 text-sm">→</span>
                  <input
                    type="time"
                    value={day.close}
                    disabled={day.closed}
                    onChange={(e) => updateDay(k, { close: e.target.value })}
                    className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
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

        {/* ── Section Alertes de Stock ─────────────────────────── */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 mt-6">
          <div className="mb-4">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8963E] animate-pulse" />
              Alertes de stock bas
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Configurez le seuil critique à partir duquel vous recevez une alerte de stock.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Seuil d'alerte (en quantité)
              </label>
              <p className="text-xs text-stone-500">
                Vous serez alerté par un signal sonore et un modal si un produit descend à ce nombre ou moins.
              </p>
            </div>
            <div className="w-full sm:w-32">
              <input
                type="number"
                min={0}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 font-bold focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSaveThreshold}
              disabled={savingThreshold}
              className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors disabled:bg-stone-400"
            >
              {savingThreshold ? "Enregistrement..." : "Enregistrer le seuil"}
            </button>
          </div>
        </section>

        {/* ── Section Hôtel (si type=hotel) ────────────────────── */}
        {isHotelType(restaurant.type) && (
          <HotelSettingsSection restaurant={restaurant} setToast={setToast} />
        )}

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

import type { HotelService, Restaurant } from "@/types";
import { Plus, X as XIcon } from "lucide-react";

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
      }) +
      " à " +
      new Date(restaurant.subscriptionExpiresAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
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
            ? "bg-gradient-to-r from-[#C8963E] to-[#a07832] text-white hover:from-[#a07832] hover:to-[#8a6828] shadow-md"
            : "bg-[#722F37] text-white hover:bg-[#5a2530]"
        }`}
      >
        <ExternalLink className="w-4 h-4" />
        {isExpired ? "Recharger maintenant" : "Renouveler mon abonnement"}
      </button>
    </section>
  );
}

/* ── Composant Code PIN ────────────────────────────────────── */

type PinMode = "idle" | "verify_to_change" | "verify_to_delete" | "set_new";

function PinSection({
  restaurant,
  setToast,
}: {
  restaurant: Restaurant;
  setToast: (v: string | null) => void;
}) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [hasPin, setHasPin] = useState(false);
  const [loadingPin, setLoadingPin] = useState(true);
  const [mode, setMode] = useState<PinMode>("idle");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const res = await fetch(`/api/restaurant/pin?restaurantId=${restaurant.id}`);
        const data = await res.json();
        if (data.ok && data.hasPin) {
          setHasPin(true);
        }
      } catch {
        /* ignore */
      }
      setLoadingPin(false);
    };
    fetchPin();
  }, [restaurant.id]);

  const resetInputs = () => {
    setPin(["", "", "", ""]);
    setError(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const verifyPinServer = async (entered: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: entered }),
      });
      const data = await res.json();
      return data.ok && data.valid;
    } catch {
      return false;
    }
  };

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value) || checking) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const entered = newPin.join("");

      if (mode === "verify_to_delete") {
        setChecking(true);
        verifyPinServer(entered).then((valid) => {
          if (valid) {
            doRemovePin();
          } else {
            setError(true);
            setPin(["", "", "", ""]);
            setTimeout(() => inputRefs.current[0]?.focus(), 150);
          }
          setChecking(false);
        });
      } else if (mode === "verify_to_change") {
        setChecking(true);
        verifyPinServer(entered).then((valid) => {
          if (valid) {
            setMode("set_new");
            setPin(["", "", "", ""]);
            setError(false);
            setTimeout(() => inputRefs.current[0]?.focus(), 150);
          } else {
            setError(true);
            setPin(["", "", "", ""]);
            setTimeout(() => inputRefs.current[0]?.focus(), 150);
          }
          setChecking(false);
        });
      } else if (mode === "set_new") {
        doSavePin(entered);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Escape") {
      setMode("idle");
      resetInputs();
    }
  };

  const doSavePin = async (newPin: string) => {
    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: newPin }),
      });
      const data = await res.json();
      if (data.ok) {
        const wasNew = !hasPin;
        setHasPin(true);
        setMode("idle");
        resetInputs();
        sessionStorage.removeItem("resto-saas:pin-ok");
        setToast(wasNew ? "Code PIN activé" : "Code PIN modifié");
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

  const doRemovePin = async () => {
    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: null }),
      });
      const data = await res.json();
      if (data.ok) {
        setHasPin(false);
        setMode("idle");
        resetInputs();
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

  const pinInputClasses = `w-11 h-12 text-center text-xl font-bold rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#722F37]/10 ${
    error
      ? "border-red-400 bg-red-50 text-red-700"
      : "border-stone-300 bg-stone-50 text-stone-900 focus:border-[#722F37]"
  }`;

  const modeLabels: Record<PinMode, { title: string; desc: string }> = {
    idle: { title: "", desc: "" },
    verify_to_change: {
      title: "Entrez le PIN actuel",
      desc: "Confirmez votre identité pour modifier le code.",
    },
    verify_to_delete: {
      title: "Entrez le PIN actuel",
      desc: "Confirmez votre identité pour supprimer la protection.",
    },
    set_new: {
      title: "Nouveau code PIN",
      desc: "Entrez le nouveau code à 4 chiffres.",
    },
  };

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

      {/* PIN actif — affichage statut + boutons modifier/supprimer */}
      {hasPin && mode === "idle" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                PIN actif
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Menu et Stats protégés
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("verify_to_change"); resetInputs(); }}
              className="flex-1 rounded-full bg-[#722F37] text-white px-4 py-2 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
            >
              Modifier le PIN
            </button>
            <button
              onClick={() => { setMode("verify_to_delete"); resetInputs(); }}
              className="rounded-full bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Pas de PIN — création */}
      {!hasPin && mode === "idle" && (
        <div>
          <p className="text-sm text-stone-600 mb-3">
            Définissez un code à 4 chiffres. Le serveur pourra gérer les commandes mais pas modifier le menu ni voir les stats.
          </p>
          <button
            onClick={() => { setMode("set_new"); resetInputs(); }}
            className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
          >
            Définir un code PIN
          </button>
        </div>
      )}

      {/* Saisie PIN (vérification ou nouveau) */}
      {mode !== "idle" && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 animate-fade-in-up">
          <p className="text-sm font-semibold text-stone-900 mb-0.5">
            {modeLabels[mode].title}
          </p>
          <p className="text-xs text-stone-500 mb-4">
            {modeLabels[mode].desc}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={pinInputClasses}
                />
              ))}
            </div>
            <button
              onClick={() => { setMode("idle"); resetInputs(); }}
              className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              Annuler
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Code incorrect
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Composant Settings Hôtel ──────────────────────────────── */

function HotelSettingsSection({
  restaurant,
  setToast,
}: {
  restaurant: Restaurant;
  setToast: (v: string | null) => void;
}) {
  const [services, setServices] = useState<HotelService[]>(restaurant.hotelServices ?? []);
  const [issues, setIssues] = useState<HotelService[]>(restaurant.hotelIssues ?? []);
  const [newService, setNewService] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [saving, setSaving] = useState(false);

  const addService = () => {
    const label = newService.trim();
    if (!label) return;
    setServices((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    setNewService("");
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addIssue = () => {
    const label = newIssue.trim();
    if (!label) return;
    setIssues((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    setNewIssue("");
  };

  const removeIssue = (id: string) => {
    setIssues((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRestaurant({
        restaurantId: restaurant.id,
        hotelServices: services,
        hotelIssues: issues,
      });
      setToast("Configuration hôtel enregistrée");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 mt-6">
      <div className="mb-4">
        <h3 className="font-bold text-stone-900">Configuration hôtel</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Configurez les services de chambre et types de problèmes disponibles.
        </p>
      </div>

      <div className="space-y-6">
        {/* Services de chambre */}
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-2">
            Services de chambre
          </h4>
          <div className="space-y-2 mb-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 bg-stone-50 rounded-xl px-3 py-2"
              >
                <span className="text-sm text-stone-700">{s.label}</span>
                <button
                  onClick={() => removeService(s.id)}
                  className="text-stone-400 hover:text-red-600 transition-colors"
                  aria-label="Supprimer"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addService()}
              placeholder="Ex: Serviettes supplémentaires"
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
            />
            <button
              onClick={addService}
              className="rounded-xl bg-[#722F37] text-white px-3 py-2 hover:bg-[#5a2530] transition-colors"
              aria-label="Ajouter"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Types de problèmes */}
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-2">
            Types de problèmes
          </h4>
          <div className="space-y-2 mb-3">
            {issues.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 bg-stone-50 rounded-xl px-3 py-2"
              >
                <span className="text-sm text-stone-700">{s.label}</span>
                <button
                  onClick={() => removeIssue(s.id)}
                  className="text-stone-400 hover:text-red-600 transition-colors"
                  aria-label="Supprimer"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addIssue()}
              placeholder="Ex: Climatisation défaillante"
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
            />
            <button
              onClick={addIssue}
              className="rounded-xl bg-[#722F37] text-white px-3 py-2 hover:bg-[#5a2530] transition-colors"
              aria-label="Ajouter"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors disabled:bg-stone-400"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}
