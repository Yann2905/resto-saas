"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Restaurant, RestaurantRow, mapRestaurant } from "@/types";
import {
  createRestaurantWithOwner,
  deleteRestaurant,
  setRestaurantActive,
  setRestaurantSubscription,
  updateRestaurantInfo,
  type CreateRestaurantInput,
} from "@/lib/admin";

type Filter = "all" | "active" | "expiring" | "inactive";

function expMillis(r: Restaurant): number {
  return r.subscriptionExpiresAt
    ? new Date(r.subscriptionExpiresAt).getTime()
    : Infinity;
}

function restaurantStatus(
  r: Restaurant
): "active" | "expiring" | "expired" | "inactive" {
  if (!r.active) return "inactive";
  const diff = expMillis(r) - Date.now();
  if (!Number.isFinite(diff)) return "active";
  if (diff <= 0) return "expired";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "expiring";
  return "active";
}

const STATUS_STYLES: Record<
  "active" | "expiring" | "expired" | "inactive",
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: "Actif",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  expiring: {
    label: "Expire bientôt",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  expired: {
    label: "Expiré",
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  inactive: {
    label: "Inactif",
    bg: "bg-stone-100 border-stone-300",
    text: "text-stone-600",
    dot: "bg-stone-400",
  },
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRestaurants((data ?? []).map((r) => mapRestaurant(r as RestaurantRow)));
      setLoading(false);
    };
    fetchAll();
    const channel = supabase
      .channel("admin-restaurants-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        fetchAll
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      const status = restaurantStatus(r);
      if (filter === "all") return true;
      if (filter === "active") return status === "active";
      if (filter === "expiring") return status === "expiring";
      if (filter === "inactive")
        return status === "inactive" || status === "expired";
      return true;
    });
  }, [restaurants, search, filter]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreate = async (input: CreateRestaurantInput) => {
    const res = await createRestaurantWithOwner(input);
    if (res.ok) {
      showToast("success", `Restaurant « ${input.name} » créé`);
      setShowCreate(false);
    } else {
      showToast("error", res.error);
    }
    return res.ok;
  };

  const handleToggleActive = async (r: Restaurant) => {
    setBusyId(r.id);
    try {
      await setRestaurantActive(r.id, !r.active);
      showToast(
        "success",
        `« ${r.name} » ${!r.active ? "activé" : "suspendu"}`
      );
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (
    r: Restaurant,
    payload: { name: string; address: string; phone: string; expiry: string }
  ) => {
    setBusyId(r.id);
    try {
      await updateRestaurantInfo(r.id, {
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
      });
      await setRestaurantSubscription(
        r.id,
        payload.expiry ? new Date(payload.expiry) : null
      );
      showToast("success", `« ${payload.name} » mis à jour`);
      setEditingId(null);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (r: Restaurant) => {
    const confirmText = prompt(
      `Pour confirmer la suppression de « ${r.name} », tapez son slug : ${r.slug}`
    );
    if (confirmText !== r.slug) {
      if (confirmText !== null) showToast("error", "Confirmation invalide");
      return;
    }
    setBusyId(r.id);
    try {
      await deleteRestaurant(r.id);
      showToast("success", `« ${r.name} » supprimé`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Restaurants
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              {restaurants.length} établissement
              {restaurants.length > 1 ? "s" : ""} · Création, abonnements,
              suspension
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              setEditingId(null);
            }}
            className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-stone-900/10"
          >
            <span className="text-lg leading-none">+</span> Nouveau restaurant
          </button>
        </div>

        {showCreate && (
          <CreateForm
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
          />
        )}

        <div className="bg-white rounded-2xl border border-stone-200 p-3 mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou slug…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(
              [
                { key: "all", label: "Tous" },
                { key: "active", label: "Actifs" },
                { key: "expiring", label: "Expire bientôt" },
                { key: "inactive", label: "Inactifs / expirés" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f.key
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-stone-500">
            <span className="w-5 h-5 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5 text-4xl">
              🏪
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              {restaurants.length === 0
                ? "Aucun restaurant"
                : "Aucun résultat"}
            </h3>
            <p className="text-sm text-stone-500">
              {restaurants.length === 0
                ? "Créez votre premier restaurant pour commencer."
                : "Ajustez votre recherche ou le filtre."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r, i) => {
              const status = restaurantStatus(r);
              const st = STATUS_STYLES[status];
              const isEditing = editingId === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-fade-in-up hover:shadow-md transition-shadow"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {isEditing ? (
                    <EditForm
                      restaurant={r}
                      busy={busyId === r.id}
                      onCancel={() => setEditingId(null)}
                      onSave={(payload) => handleSaveEdit(r, payload)}
                    />
                  ) : (
                    <RestaurantRowView
                      restaurant={r}
                      statusStyle={st}
                      busy={busyId === r.id}
                      onEdit={() => {
                        setEditingId(r.id);
                        setShowCreate(false);
                      }}
                      onToggleActive={() => handleToggleActive(r)}
                      onDelete={() => handleDelete(r)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-sm z-50 animate-fade-in-up rounded-2xl border shadow-xl backdrop-blur p-4 ${
            toast.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
              : "bg-red-50/95 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-start gap-2 text-sm">
            <span>{toast.type === "success" ? "✓" : "⚠"}</span>
            <span className="flex-1">{toast.msg}</span>
          </div>
        </div>
      )}
    </main>
  );
}

function RestaurantRowView({
  restaurant,
  statusStyle,
  busy,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  restaurant: Restaurant;
  statusStyle: (typeof STATUS_STYLES)[keyof typeof STATUS_STYLES];
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const expiry = restaurant.subscriptionExpiresAt
    ? new Date(restaurant.subscriptionExpiresAt)
    : null;
  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-lg flex-shrink-0 shadow-sm">
          {restaurant.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-stone-900 truncate">
              {restaurant.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
              />
              {statusStyle.label}
            </span>
          </div>
          <div className="text-xs text-stone-500 mt-0.5 truncate">
            <span className="font-mono">/{restaurant.slug}</span>
            {restaurant.address && <> · {restaurant.address}</>}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            {expiry
              ? `Expire le ${expiry.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`
              : "Sans date d'expiration"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap justify-end">
        <button
          onClick={onToggleActive}
          disabled={busy}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
            restaurant.active
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {restaurant.active ? "✓ Actif" : "Off"}
        </button>
        <button
          onClick={onEdit}
          disabled={busy}
          className="rounded-lg px-3 py-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          Éditer
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          aria-label="Supprimer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function EditForm({
  restaurant,
  busy,
  onCancel,
  onSave,
}: {
  restaurant: Restaurant;
  busy: boolean;
  onCancel: () => void;
  onSave: (p: {
    name: string;
    address: string;
    phone: string;
    expiry: string;
  }) => void;
}) {
  const expiryIso = restaurant.subscriptionExpiresAt
    ? new Date(restaurant.subscriptionExpiresAt).toISOString().slice(0, 10)
    : "";
  const [form, setForm] = useState({
    name: restaurant.name,
    address: restaurant.address ?? "",
    phone: restaurant.phone ?? "",
    expiry: expiryIso,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="p-4 sm:p-5 border-l-4 border-stone-900">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nom">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Téléphone">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Abonnement expire le (vide = illimité)">
          <input
            type="date"
            value={form.expiry}
            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
            className="input"
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(214 211 209);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(12 10 9);
          box-shadow: 0 0 0 3px rgba(12, 10, 9, 0.1);
        }
      `}</style>
    </form>
  );
}

function CreateForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (input: CreateRestaurantInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
    ownerEmail: "",
    ownerPassword: "",
    expiry: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await onSubmit({
      name: form.name,
      slug: form.slug || form.name,
      address: form.address,
      phone: form.phone,
      ownerEmail: form.ownerEmail,
      ownerPassword: form.ownerPassword,
      subscriptionExpiresAt: form.expiry ? new Date(form.expiry) : null,
    });
    setBusy(false);
    if (ok) {
      setForm({
        name: "",
        slug: "",
        address: "",
        phone: "",
        ownerEmail: "",
        ownerPassword: "",
        expiry: "",
      });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-2xl border-2 border-stone-900 bg-white overflow-hidden animate-fade-in-up"
    >
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white px-5 py-3">
        <h3 className="font-bold tracking-tight">Nouveau restaurant</h3>
        <p className="text-[11px] text-stone-400">
          Crée le restaurant ET le compte owner en une étape
        </p>
      </div>
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nom du restaurant">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Chez Mama"
            className="input"
          />
        </Field>
        <Field label="Slug URL (optionnel)">
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="chez-mama (auto si vide)"
            className="input"
          />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Yaoundé, Cameroun"
            className="input"
          />
        </Field>
        <Field label="Téléphone">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+237…"
            className="input"
          />
        </Field>
        <Field label="Expiration abonnement (optionnel)">
          <input
            type="date"
            value={form.expiry}
            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
            className="input"
          />
        </Field>
        <div className="sm:col-span-2 border-t border-stone-200 mt-2 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Compte owner (propriétaire)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email">
              <input
                required
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm({ ...form, ownerEmail: e.target.value })
                }
                placeholder="owner@restaurant.com"
                className="input"
              />
            </Field>
            <Field label="Mot de passe (min. 6)">
              <input
                required
                type="password"
                minLength={6}
                value={form.ownerPassword}
                onChange={(e) =>
                  setForm({ ...form, ownerPassword: e.target.value })
                }
                placeholder="••••••"
                className="input"
              />
            </Field>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Création…
            </>
          ) : (
            <>Créer le restaurant</>
          )}
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(214 211 209);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(12 10 9);
          box-shadow: 0 0 0 3px rgba(12, 10, 9, 0.1);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}
