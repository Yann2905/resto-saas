"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Save,
  ToggleLeft,
  ToggleRight,
  Users,
  Bell,
  BarChart3,
  QrCode,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Restaurant, RestaurantRow, mapRestaurant } from "@/types";

type FeatureKey = "waiters" | "pushNotifications" | "fullStats" | "maxTables";

const FEATURES: {
  key: FeatureKey;
  label: string;
  desc: string;
  Icon: typeof Users;
  type: "boolean" | "number";
}[] = [
  {
    key: "waiters",
    label: "Gestion des serveurs",
    desc: "Comptes serveurs, attribution par zone de tables, bouton J'ai reçu",
    Icon: Users,
    type: "boolean",
  },
  {
    key: "pushNotifications",
    label: "Notifications push",
    desc: "Alertes push même quand l'app est fermée (PWA)",
    Icon: Bell,
    type: "boolean",
  },
  {
    key: "fullStats",
    label: "Statistiques complètes",
    desc: "Stats détaillées : CA par période, top produits, heures de pointe",
    Icon: BarChart3,
    type: "boolean",
  },
  {
    key: "maxTables",
    label: "Nombre de tables max",
    desc: "Limite le nombre de QR codes / tables disponibles",
    Icon: QrCode,
    type: "number",
  },
];

const PLAN_DEFAULTS: Record<string, Record<string, boolean | number>> = {
  starter: { waiters: false, pushNotifications: false, fullStats: false, maxTables: 10 },
  pro: { waiters: true, pushNotifications: true, fullStats: true, maxTables: 10 },
  business: { waiters: true, pushNotifications: true, fullStats: true, maxTables: 10 },
};

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [plan, setPlan] = useState("starter");
  const [isPartner, setIsPartner] = useState(false);
  const [active, setActive] = useState(true);
  const [expiry, setExpiry] = useState("");
  const [overrides, setOverrides] = useState<Record<string, boolean | number | undefined>>({});

  const fetchRestaurant = useCallback(async () => {
    const res = await fetch(`/api/admin/restaurants/get?id=${id}`);
    const json = await res.json();
    if (!json.ok) { setLoading(false); return; }
    const found = mapRestaurant(json.restaurant as RestaurantRow);
    setRestaurant(found);
    setPlan(found.plan);
    setIsPartner(found.isPartner);
    setActive(found.active);
    setExpiry(
      found.subscriptionExpiresAt
        ? new Date(found.subscriptionExpiresAt).toISOString().slice(0, 10)
        : ""
    );
    setOverrides((found.featureOverrides as Record<string, boolean | number | undefined>) ?? {});
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const getEffectiveValue = (key: FeatureKey): boolean | number => {
    if (isPartner) return PLAN_DEFAULTS.business[key];
    if (overrides[key] !== undefined) return overrides[key] as boolean | number;
    return PLAN_DEFAULTS[plan]?.[key] ?? PLAN_DEFAULTS.starter[key];
  };

  const isOverridden = (key: FeatureKey) => overrides[key] !== undefined;

  const toggleOverride = (key: FeatureKey) => {
    const current = getEffectiveValue(key);
    if (isOverridden(key)) {
      const next = { ...overrides };
      delete next[key];
      setOverrides(next);
    } else {
      setOverrides({ ...overrides, [key]: typeof current === "boolean" ? !current : current });
    }
  };

  const setOverrideValue = (key: FeatureKey, val: boolean | number) => {
    setOverrides({ ...overrides, [key]: val });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanOverrides: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(overrides)) {
        if (v !== undefined) cleanOverrides[k] = v;
      }

      await fetch("/api/admin/restaurants/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: id,
          plan,
          isPartner,
          active,
          planExpiresAt: expiry || null,
          featureOverrides: cleanOverrides,
        }),
      });
      await fetchRestaurant();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <span className="w-6 h-6 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-500">Restaurant introuvable</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/restaurants"
            className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 truncate">
              {restaurant.name}
            </h1>
            <p className="text-xs text-stone-500">
              /{restaurant.slug} · ID: {restaurant.id.slice(0, 8)}…
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-stone-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {/* Plan + Status */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Plan */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>

          {/* Partenaire */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
              Partenaire
            </label>
            <button
              onClick={() => setIsPartner(!isPartner)}
              className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isPartner
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-stone-50 text-stone-500 border border-stone-200"
              }`}
            >
              <Crown className={`w-4 h-4 ${isPartner ? "text-amber-500" : "text-stone-400"}`} />
              {isPartner ? "Partenaire VIP" : "Client normal"}
            </button>
          </div>

          {/* Actif */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
              Statut
            </label>
            <button
              onClick={() => setActive(!active)}
              className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {active ? (
                <ToggleRight className="w-5 h-5 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-red-400" />
              )}
              {active ? "Actif" : "Suspendu"}
            </button>
          </div>

          {/* Expiration */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
              Expiration
            </label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>
        </div>

        {isPartner && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Mode partenaire activé</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Toutes les fonctionnalités sont débloquées, indépendamment du plan. Les overrides ci-dessous sont ignorés.
              </p>
            </div>
          </div>
        )}

        {/* Feature toggles */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-bold text-stone-900">Fonctionnalités</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Les valeurs par défaut viennent du plan. Cliquez sur &ldquo;Override&rdquo; pour forcer une valeur.
            </p>
          </div>
          <div className="divide-y divide-stone-100">
            {FEATURES.map((feat) => {
              const effective = getEffectiveValue(feat.key);
              const overridden = isOverridden(feat.key);
              const Icon = feat.Icon;

              return (
                <div key={feat.key} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    effective ? "bg-emerald-50" : "bg-stone-100"
                  }`}>
                    <Icon className={`w-5 h-5 ${effective ? "text-emerald-600" : "text-stone-400"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">{feat.label}</span>
                      {overridden && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                          Override
                        </span>
                      )}
                      {!overridden && (
                        <span className="text-[10px] text-stone-400">
                          (plan {plan})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{feat.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {feat.type === "boolean" ? (
                      <button
                        onClick={() => {
                          if (overridden) {
                            setOverrideValue(feat.key, !(effective as boolean));
                          } else {
                            setOverrideValue(feat.key, !(PLAN_DEFAULTS[plan]?.[feat.key] ?? false));
                          }
                        }}
                        disabled={isPartner}
                        className="disabled:opacity-30"
                      >
                        {effective ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-stone-300" />
                        )}
                      </button>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={(effective as number) ?? 10}
                        onChange={(e) =>
                          setOverrideValue(feat.key, Math.max(1, parseInt(e.target.value) || 1))
                        }
                        disabled={isPartner}
                        className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-30"
                      />
                    )}
                    {overridden && !isPartner && (
                      <button
                        onClick={() => toggleOverride(feat.key)}
                        title="Supprimer l'override (revenir au plan)"
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-red-50 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-stone-500" />
            Informations du restaurant
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-stone-500">Nom :</span>{" "}
              <span className="font-medium">{restaurant.name}</span>
            </div>
            <div>
              <span className="text-stone-500">Slug :</span>{" "}
              <span className="font-mono text-xs">/{restaurant.slug}</span>
            </div>
            <div>
              <span className="text-stone-500">Adresse :</span>{" "}
              <span className="font-medium">{restaurant.address || "—"}</span>
            </div>
            <div>
              <span className="text-stone-500">Téléphone :</span>{" "}
              <span className="font-medium">{restaurant.phone || "—"}</span>
            </div>
            <div>
              <span className="text-stone-500">Créé le :</span>{" "}
              <span className="font-medium">
                {new Date(restaurant.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Seuil stock bas :</span>{" "}
              <span className="font-medium">{restaurant.lowStockThreshold}</span>
            </div>
          </div>
        </div>

        {/* Quick link */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Voir le menu client
          </a>
        </div>
      </div>
    </main>
  );
}
