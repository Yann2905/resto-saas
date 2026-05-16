"use client";

import { useEffect, useState } from "react";

import { Check, Lightbulb } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [loading, user]);

  useEffect(() => {
    if (!restaurant) return;
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
    setSaving(true);
    try {
      await updateRestaurantHours(restaurant.id, alwaysOpen ? null : hours);
      setToast("Horaires enregistrés");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
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
              disabled={saving}
              className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </section>

        <p className="text-xs text-stone-500 mt-4 text-center flex items-center justify-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" aria-hidden />
          Astuce : les passages d'une journée à l'autre (ex : 18h → 02h) sont
          gérés automatiquement.
        </p>
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
