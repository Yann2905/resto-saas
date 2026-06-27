"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, Check, Hotel, Plus, Search, Store, Trash2, UtensilsCrossed, X } from "lucide-react";
import { Restaurant, RestaurantRow, RestaurantType, mapRestaurant } from "@/types";
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
    bg: "bg-[#C8963E]/5 border-[#e0c07a]",
    text: "text-[#6e5a20]",
    dot: "bg-[#C8963E]",
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
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/admin/restaurants/list");
        const json = await res.json();
        if (cancelled || !json.ok) return;
        setRestaurants(
          (json.restaurants as RestaurantRow[]).map(mapRestaurant)
        );
      } catch (e) {
        console.error("[admin] fetch restaurants error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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
      showToast("success", `Établissement « ${input.name} » créé`);
      setShowCreate(false);
    } else {
      showToast("error", res.error);
    }
    return res.ok;
  };

  const handleToggleActive = async (r: Restaurant) => {

    try {
      await setRestaurantActive(r.id, !r.active);
      showToast(
        "success",
        `« ${r.name} » ${!r.active ? "activé" : "suspendu"}`
      );
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleSaveEdit = async (
    r: Restaurant,
    payload: { name: string; address: string; phone: string; expiry: string; plan: string; type: RestaurantType; logoUrl: string }
  ) => {

    try {
      await updateRestaurantInfo(r.id, {
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
        logoUrl: payload.logoUrl || null,
      });
      await setRestaurantSubscription(
        r.id,
        payload.expiry ? new Date(payload.expiry) : null
      );
      // Mise à jour du plan
      if (payload.plan !== r.plan) {
        await fetch("/api/admin/restaurants/plan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: r.id, plan: payload.plan }),
        });
      }
      // Mise à jour du type
      if (payload.type !== r.type) {
        await fetch("/api/admin/restaurants/features", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: r.id, type: payload.type }),
        });
      }
      showToast("success", `« ${payload.name} » mis à jour`);
      setEditingId(null);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
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

    try {
      await deleteRestaurant(r.id);
      showToast("success", `« ${r.name} » supprimé`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Établissements
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
            className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-all hover:scale-105 flex items-center gap-1.5 shadow-lg shadow-stone-900/10"
          >
            <Plus className="w-4 h-4" aria-hidden /> Nouvel établissement
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou slug…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
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
                    ? "bg-[#722F37] text-white"
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
            <span className="w-5 h-5 border-2 border-stone-300 border-t-[#C8963E] rounded-full animate-spin" />
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <Store className="w-10 h-10 text-stone-400" aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              {restaurants.length === 0
                ? "Aucun établissement"
                : "Aucun résultat"}
            </h3>
            <p className="text-sm text-stone-500">
              {restaurants.length === 0
                ? "Créez votre premier établissement pour commencer."
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
                                            onCancel={() => setEditingId(null)}
                      onSave={(payload) => handleSaveEdit(r, payload)}
                    />
                  ) : (
                    <RestaurantRowView
                      restaurant={r}
                      statusStyle={st}
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
            {toast.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            )}
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
  onEdit,
  onToggleActive,
  onDelete,
}: {
  restaurant: Restaurant;
  statusStyle: (typeof STATUS_STYLES)[keyof typeof STATUS_STYLES];
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-stone-950 text-lg flex-shrink-0 shadow-sm">
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
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              restaurant.type === "hotel"
                ? "bg-purple-100 text-purple-800"
                : restaurant.type === "both"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-stone-100 text-stone-600"
            }`}>
              {restaurant.type === "hotel" ? "Hôtel" : restaurant.type === "both" ? "Resto + Hôtel" : "Restaurant"}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              restaurant.plan === "business"
                ? "bg-[#C8963E]/10 text-[#6e5a20]"
                : restaurant.plan === "pro"
                ? "bg-blue-100 text-blue-800"
                : "bg-stone-100 text-stone-600"
            }`}>
              {restaurant.plan ?? "starter"}
            </span>
            <span className="text-[11px] text-stone-500">
              {expiry
                ? `Expire le ${expiry.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Sans date d'expiration"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap justify-end">
        <button
          onClick={onToggleActive}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            restaurant.active
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {restaurant.active ? "Actif" : "Inactif"}
        </button>
        <Link
          href={`/admin/restaurants/${restaurant.id}`}
          className="rounded-lg px-3 py-2 text-xs font-semibold bg-[#C8963E]/5 text-[#8a6828] hover:bg-[#C8963E]/10 transition-colors"
        >
          Gérer
        </Link>
        <button
          onClick={onEdit}
          className="rounded-lg px-3 py-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
        >
          Éditer
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center"
          aria-label="Supprimer"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function EditForm({
  restaurant,
  onCancel,
  onSave,
}: {
  restaurant: Restaurant;
  onCancel: () => void;
  onSave: (p: {
    name: string;
    address: string;
    phone: string;
    expiry: string;
    plan: string;
    type: RestaurantType;
    logoUrl: string;
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
    plan: restaurant.plan ?? "starter",
    type: restaurant.type ?? "restaurant" as RestaurantType,
    logoUrl: restaurant.logoUrl ?? "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="p-4 sm:p-5 border-l-4 border-[#722F37]">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative group">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-stone-200" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-white text-xl">
              {form.name.charAt(0) || "?"}
            </div>
          )}
          <label className={`absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingLogo ? "!opacity-100" : ""}`}>
            {uploadingLogo ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingLogo}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingLogo(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("folder", "logos");
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const json = await res.json();
                  if (json.ok) setForm((prev) => ({ ...prev, logoUrl: json.url }));
                } finally {
                  setUploadingLogo(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        <div className="text-sm">
          <p className="font-medium text-stone-700">{form.logoUrl ? "Logo actuel" : "Pas de logo"}</p>
          {form.logoUrl && (
            <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="text-xs text-red-600 hover:underline flex items-center gap-1 mt-0.5">
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          )}
        </div>
      </div>

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
        <Field label="Plan">
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as "starter" | "pro" | "business" })}
            className="input"
          >
            <option value="starter">Starter (10 tables)</option>
            <option value="pro">Pro (25 tables + serveurs)</option>
            <option value="business">Business (illimité)</option>
          </select>
        </Field>
        <Field label="Type" className="sm:col-span-2">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as RestaurantType })}
            className="input"
          >
            <option value="restaurant">Restaurant</option>
            <option value="hotel">Hôtel</option>
            <option value="both">Restaurant + Hôtel</option>
          </select>
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
          className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
        >
          Enregistrer
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
    type: "restaurant" as RestaurantType,
    logoUrl: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit({
      name: form.name,
      slug: form.slug || form.name,
      address: form.address,
      phone: form.phone,
      ownerEmail: form.ownerEmail,
      ownerPassword: form.ownerPassword,
      subscriptionExpiresAt: form.expiry
        ? new Date(form.expiry)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      type: form.type,
      logoUrl: form.logoUrl || undefined,
    });
    if (ok) {
      setForm({
        name: "",
        slug: "",
        address: "",
        phone: "",
        ownerEmail: "",
        ownerPassword: "",
        expiry: "",
        type: "restaurant",
        logoUrl: "",
      });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-2xl border-2 border-[#722F37] bg-white overflow-hidden animate-fade-in-up"
    >
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white px-5 py-3">
        <h3 className="font-bold tracking-tight">Nouvel établissement</h3>
        <p className="text-[11px] text-stone-400">
          Crée l&apos;établissement ET le compte propriétaire en une étape
        </p>
      </div>
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nom de l'établissement">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Chez Mama, Hôtel Ivoire…"
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
        <Field label="Type d'établissement" className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "restaurant" as const, label: "Restaurant", Icon: UtensilsCrossed, desc: "Menu et commandes par table" },
              { value: "hotel" as const, label: "Hôtel", Icon: Hotel, desc: "Room service, services et signalements" },
              { value: "both" as const, label: "Les deux", Icon: Store, desc: "Restaurant + services hôteliers" },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  form.type === opt.value
                    ? "border-[#722F37] bg-stone-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <opt.Icon className={`w-5 h-5 mb-1.5 ${form.type === opt.value ? "text-stone-900" : "text-stone-400"}`} />
                <div className="text-sm font-bold text-stone-900">{opt.label}</div>
                <div className="text-[10px] text-stone-500 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Logo (optionnel)" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-stone-200" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 text-lg font-bold">
                {form.name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <label className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium border transition-colors ${uploadingLogo ? "opacity-50" : "hover:bg-stone-50"} border-stone-200 text-stone-700`}>
              {uploadingLogo ? "Upload…" : form.logoUrl ? "Changer" : "Ajouter un logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingLogo}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingLogo(true);
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("folder", "logos");
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const json = await res.json();
                  setUploadingLogo(false);
                  if (json.ok) setForm((prev) => ({ ...prev, logoUrl: json.url }));
                }}
              />
            </label>
            {form.logoUrl && (
              <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="text-xs text-red-600 hover:underline">
                Supprimer
              </button>
            )}
          </div>
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
        <Field label="Expiration (14j gratuits si vide)">
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
          className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors flex items-center justify-center gap-2"
        >
          Créer l&apos;établissement
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
