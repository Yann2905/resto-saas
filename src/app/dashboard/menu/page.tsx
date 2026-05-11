"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadProductImage } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import {
  Category,
  CategoryRow,
  Product,
  ProductRow,
  mapCategory,
  mapProduct,
} from "@/types";
import { UtensilsCrossed, X } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { confirmDanger, toastError, toastSuccess } from "@/lib/swal";

type ProductForm = {
  name: string;
  price: string;
  categoryId: string;
  stockQuantity: string;
  imageUrl: string;
  available: boolean;
};

const emptyProductForm: ProductForm = {
  name: "",
  price: "",
  categoryId: "",
  stockQuantity: "",
  imageUrl: "",
  available: true,
};

type CategoryForm = {
  name: string;
  parentId: string; // "" = parent principal
};

export default function MenuAdminPage() {
  const router = useRouter();
  const { user, restaurant, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/dashboard/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;

    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("order", { ascending: true });
      if (cancelled) return;
      setCategories((data ?? []).map((c) => mapCategory(c as CategoryRow)));
    };
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("order", { ascending: true });
      if (cancelled) return;
      setProducts((data ?? []).map((p) => mapProduct(p as ProductRow)));
    };

    fetchCategories();
    fetchProducts();

    const channel = supabase
      .channel(`menu-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        fetchCategories
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        fetchProducts
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurant]);

  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories]
  );
  const leafCategories = useMemo(() => {
    const hasChildren = new Set(
      categories.filter((c) => c.parentId).map((c) => c.parentId as string)
    );
    return categories.filter((c) => !hasChildren.has(c.id));
  }, [categories]);

  const categoryName = (id: string): string => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return "—";
    if (cat.parentId) {
      const parent = categories.find((c) => c.id === cat.parentId);
      return parent ? `${parent.name} · ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const filteredProducts =
    filterCat === "all"
      ? products
      : products.filter((p) => p.categoryId === filterCat);

  const saveProduct = async (id: string | null, form: ProductForm) => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const payload = {
        restaurant_id: restaurant.id,
        name: form.name.trim(),
        price: parseInt(form.price, 10) || 0,
        category_id: form.categoryId,
        stock_quantity: parseInt(form.stockQuantity, 10) || 0,
        image_url: form.imageUrl.trim() || null,
        available: form.available,
        order: id
          ? products.find((p) => p.id === id)?.order ?? products.length + 1
          : products.length + 1,
      };
      if (id) {
        await supabase.from("products").update(payload).eq("id", id);
        setEditingProductId(null);
      } else {
        await supabase.from("products").insert(payload);
        setShowAddProduct(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const ok = await confirmDanger({
      title: `Supprimer « ${product.name} » ?`,
      text: "Ce plat sera retiré du menu. Cette action est irréversible.",
      confirmText: "Oui, supprimer",
    });
    if (!ok) return;

    // Optimistic UI : retire tout de suite
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== id));

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setProducts(previous); // rollback
      await toastError(error.message || "Suppression impossible");
      return;
    }
    await toastSuccess(`« ${product.name} » supprimé`);
  };

  const toggleAvailable = async (p: Product) => {
    // Optimistic UI
    const previous = products;
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, available: !p.available } : x))
    );
    const { error } = await supabase
      .from("products")
      .update({ available: !p.available })
      .eq("id", p.id);
    if (error) {
      setProducts(previous);
      await toastError(error.message || "Mise à jour impossible");
    }
  };

  const saveCategory = async (id: string | null, form: CategoryForm) => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const parentId = form.parentId === "" ? null : form.parentId;
      const siblings = categories.filter((c) => c.parentId === parentId);
      const order = id
        ? categories.find((c) => c.id === id)?.order ?? siblings.length + 1
        : siblings.length + 1;
      const payload = {
        restaurant_id: restaurant.id,
        name: form.name.trim(),
        parent_id: parentId,
        order,
      };
      if (id) {
        await supabase.from("categories").update(payload).eq("id", id);
        setEditingCategoryId(null);
      } else {
        await supabase.from("categories").insert(payload);
        setShowAddCategory(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const hasChildren = categories.some((c) => c.parentId === id);
    const hasProducts = products.some((p) => p.categoryId === id);
    if (hasChildren) {
      await toastError("Cette catégorie contient des sous-catégories.");
      return;
    }
    if (hasProducts) {
      await toastError("Cette catégorie contient des produits.");
      return;
    }
    const ok = await confirmDanger({
      title: `Supprimer « ${cat.name} » ?`,
      text: "Cette catégorie sera retirée du menu.",
      confirmText: "Oui, supprimer",
    });
    if (!ok) return;

    const previous = categories;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setCategories(previous);
      await toastError(error.message || "Suppression impossible");
      return;
    }
    await toastSuccess(`« ${cat.name} » supprimée`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Gestion du menu
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Ajoutez vos catégories puis vos plats. Les modifications
              apparaissent instantanément côté client.
            </p>
          </div>
        </div>

        <section className="mb-8 bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900">Catégories</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Ex : « Nourriture » → sous-catégorie « Plats locaux »
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddCategory((v) => !v);
                setEditingCategoryId(null);
              }}
              className="rounded-full bg-stone-900 text-white px-4 py-2 text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              {showAddCategory ? "Annuler" : "+ Catégorie"}
            </button>
          </div>

          {showAddCategory && (
            <CategoryFormInline
              parentOptions={parentCategories}
              onCancel={() => setShowAddCategory(false)}
              onSave={(f) => saveCategory(null, f)}
              saving={saving}
            />
          )}

          {parentCategories.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              Aucune catégorie. Commencez par en créer une.
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {parentCategories.map((parent) => {
                const subs = categories.filter((c) => c.parentId === parent.id);
                return (
                  <div
                    key={parent.id}
                    className="rounded-xl border border-stone-200 bg-stone-50/60"
                  >
                    <CategoryRowView
                      category={parent}
                      editing={editingCategoryId === parent.id}
                      parentOptions={parentCategories.filter(
                        (p) => p.id !== parent.id
                      )}
                      onEdit={() => {
                        setEditingCategoryId(parent.id);
                        setShowAddCategory(false);
                      }}
                      onCancel={() => setEditingCategoryId(null)}
                      onSave={(f) => saveCategory(parent.id, f)}
                      onDelete={() => deleteCategory(parent.id)}
                      saving={saving}
                      isParent
                    />
                    {subs.length > 0 && (
                      <div className="pl-6 pr-3 pb-3 space-y-1">
                        {subs.map((sub) => (
                          <CategoryRowView
                            key={sub.id}
                            category={sub}
                            editing={editingCategoryId === sub.id}
                            parentOptions={parentCategories}
                            onEdit={() => {
                              setEditingCategoryId(sub.id);
                              setShowAddCategory(false);
                            }}
                            onCancel={() => setEditingCategoryId(null)}
                            onSave={(f) => saveCategory(sub.id, f)}
                            onDelete={() => deleteCategory(sub.id)}
                            saving={saving}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-stone-900">Plats & Boissons</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {products.length} produit{products.length > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddProduct((v) => !v);
                setEditingProductId(null);
              }}
              disabled={leafCategories.length === 0}
              className="rounded-full bg-stone-900 text-white px-4 py-2 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-300 transition-colors"
            >
              {showAddProduct ? "Annuler" : "+ Produit"}
            </button>
          </div>

          {leafCategories.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4">
              Créez au moins une catégorie avant d'ajouter un produit.
            </div>
          )}

          {showAddProduct && leafCategories.length > 0 && (
            <ProductFormInline
              restaurantId={restaurant.id}
              leafCategories={leafCategories}
              categoryName={categoryName}
              onCancel={() => setShowAddProduct(false)}
              onSave={(f) => saveProduct(null, f)}
              saving={saving}
            />
          )}

          {categories.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterCat("all")}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  filterCat === "all"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Toutes ({products.length})
              </button>
              {leafCategories.map((cat) => {
                const n = products.filter((p) => p.categoryId === cat.id)
                  .length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCat(cat.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      filterCat === cat.id
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {categoryName(cat.id)} ({n})
                  </button>
                );
              })}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              Aucun produit dans cette catégorie.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) =>
                editingProductId === p.id ? (
                  <ProductFormInline
                    key={p.id}
                    restaurantId={restaurant.id}
                    initial={{
                      name: p.name,
                      price: String(p.price),
                      categoryId: p.categoryId,
                      stockQuantity: String(p.stockQuantity),
                      imageUrl: p.imageUrl ?? "",
                      available: p.available,
                    }}
                    leafCategories={leafCategories}
                    categoryName={categoryName}
                    onCancel={() => setEditingProductId(null)}
                    onSave={(f) => saveProduct(p.id, f)}
                    saving={saving}
                  />
                ) : (
                  <ProductRowView
                    key={p.id}
                    product={p}
                    categoryLabel={categoryName(p.categoryId)}
                    onEdit={() => {
                      setEditingProductId(p.id);
                      setShowAddProduct(false);
                    }}
                    onDelete={() => deleteProduct(p.id)}
                    onToggleAvailable={() => toggleAvailable(p)}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProductRowView({
  product,
  categoryLabel,
  onEdit,
  onDelete,
  onToggleAvailable,
}: {
  product: Product;
  categoryLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailable: () => void;
}) {
  const out = !product.available || product.stockQuantity <= 0;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-stone-300 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-16 h-16 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0 bg-stone-100"
          />
        ) : (
          <div className="w-16 h-16 sm:w-14 sm:h-14 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center text-stone-400">
            <UtensilsCrossed className="w-6 h-6" aria-hidden />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-900 truncate">
            {product.name}
          </div>
          <div className="text-xs text-stone-500 truncate">{categoryLabel}</div>
          <div className="mt-1 flex items-center gap-3 text-xs flex-wrap">
            <span className="font-semibold text-stone-700">
              {formatFCFA(product.price)}
            </span>
            <span className="text-stone-500">
              Stock :{" "}
              <span className="font-semibold">{product.stockQuantity}</span>
            </span>
            {out && (
              <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                Indispo
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 sm:ml-2">
        <button
          onClick={onToggleAvailable}
          className={`flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            product.available
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {product.available ? "Actif" : "Off"}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
        >
          Éditer
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg px-3 py-2 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center"
          aria-label="Supprimer"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function ProductFormInline({
  restaurantId,
  initial,
  leafCategories,
  categoryName,
  onCancel,
  onSave,
  saving,
}: {
  restaurantId: string;
  initial?: ProductForm;
  leafCategories: Category[];
  categoryName: (id: string) => string;
  onCancel: () => void;
  onSave: (form: ProductForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProductForm>(
    initial ?? { ...emptyProductForm, categoryId: leafCategories[0]?.id ?? "" }
  );
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Fichier invalide (image uniquement).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image trop lourde (max 10 Mo).");
      return;
    }
    setUploading(true);
    setUploadStep("Compression…");
    try {
      // Petit yield pour que le label s'affiche avant le travail bloquant
      await new Promise((r) => setTimeout(r, 30));
      setUploadStep("Envoi…");
      const url = await uploadProductImage(restaurantId, file);
      setForm((f) => ({ ...f, imageUrl: url }));
      setUploadStep("");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Échec de l'upload");
      setUploadStep("");
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId || uploading) return;
    onSave(form);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border-2 border-stone-900 bg-white p-4 sm:p-5 mb-3 animate-fade-in-up"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-4 sm:gap-5">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageUrl}
                alt="Aperçu"
                className="w-full h-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="w-10 h-10 text-stone-300" aria-hidden />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-[11px] font-medium tracking-wide">
                  {uploadStep}
                </span>
              </div>
            )}
          </div>
          <label className="mt-2 w-full cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <span className="block text-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-2 px-3 transition-colors">
              {form.imageUrl ? "Changer" : "Choisir une photo"}
            </span>
          </label>
          {form.imageUrl && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
              className="mt-1 text-[11px] text-stone-500 hover:text-red-600"
            >
              Retirer
            </button>
          )}
          {uploadError && (
            <p className="mt-1 text-[11px] text-red-600 text-center">
              {uploadError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nom" className="sm:col-span-2">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Ndolé"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>
          <Field label="Catégorie" className="sm:col-span-2">
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 bg-white"
            >
              <option value="">— Choisir —</option>
              {leafCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryName(c.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prix (FCFA)">
            <input
              required
              type="number"
              inputMode="numeric"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="2500"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>
          <Field label="Stock">
            <input
              required
              type="number"
              inputMode="numeric"
              min="0"
              value={form.stockQuantity}
              onChange={(e) =>
                setForm({ ...form, stockQuantity: e.target.value })
              }
              placeholder="20"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-stone-700 mt-1">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) =>
                setForm({ ...form, available: e.target.checked })
              }
              className="rounded border-stone-300 w-4 h-4"
            />
            Disponible immédiatement
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function CategoryRowView({
  category,
  editing,
  parentOptions,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  saving,
  isParent = false,
}: {
  category: Category;
  editing: boolean;
  parentOptions: Category[];
  onEdit: () => void;
  onCancel: () => void;
  onSave: (form: CategoryForm) => void;
  onDelete: () => void;
  saving: boolean;
  isParent?: boolean;
}) {
  if (editing) {
    return (
      <div className={isParent ? "p-3" : ""}>
        <CategoryFormInline
          parentOptions={parentOptions}
          initial={{
            name: category.name,
            parentId: category.parentId ?? "",
          }}
          onCancel={onCancel}
          onSave={onSave}
          saving={saving}
        />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        isParent
          ? "px-4 py-3"
          : "px-3 py-2 rounded-lg bg-white border border-stone-200"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`truncate ${
            isParent ? "font-bold text-stone-900" : "text-sm text-stone-700"
          }`}
        >
          {category.name}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="rounded-lg px-2 py-1 text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
        >
          Éditer
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center"
          aria-label="Supprimer"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function CategoryFormInline({
  parentOptions,
  initial,
  onCancel,
  onSave,
  saving,
}: {
  parentOptions: Category[];
  initial?: CategoryForm;
  onCancel: () => void;
  onSave: (form: CategoryForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CategoryForm>(
    initial ?? { name: "", parentId: "" }
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };
  return (
    <form
      onSubmit={submit}
      className="rounded-xl border-2 border-stone-900 bg-white p-4 my-2 animate-fade-in-up"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nom">
          <input
            required
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex : Boissons"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          />
        </Field>
        <Field label="Parent (optionnel)">
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 bg-white"
          >
            <option value="">— Catégorie principale —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-stone-900 text-white px-5 py-2 text-sm font-semibold hover:bg-stone-800 disabled:bg-stone-400 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
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
