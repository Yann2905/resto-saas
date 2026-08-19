"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, QrCode, Search, Sun, UtensilsCrossed, X } from "lucide-react";
import { Category, Product } from "@/types";
import { formatFCFA } from "@/lib/format";
import { addToCart, cartCount, cartTotal, getCart } from "@/lib/cart";
import SwipeConfirm from "./_components/swipe-confirm";

type Props = {
  restaurant: { id: string; name: string; slug: string; logoUrl?: string | null };
  categories: Category[];
  products: Product[];
  tableNumber: number | null;
  roomLabel?: string | null;
  deliveryMode?: boolean;
  deliveryFee?: number;
};

export default function MenuClient({
  restaurant,
  categories,
  products,
  tableNumber,
  roomLabel,
  deliveryMode = false,
  deliveryFee = 0,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const tableKey = deliveryMode ? "delivery" : (roomLabel ?? (tableNumber ? String(tableNumber) : "na"));
  const locationLabel = deliveryMode ? "Livraison" : (roomLabel ? `Chambre ${roomLabel}` : `Table ${tableNumber}`);
  const locationParam = deliveryMode
    ? "mode=delivery"
    : roomLabel
    ? `room=${encodeURIComponent(roomLabel)}`
    : `table=${tableNumber}`;

  useEffect(() => {
    const refresh = () => {
      const items = getCart(restaurant.id, tableKey);
      setCount(cartCount(items));
      setTotal(cartTotal(items));
    };
    refresh();
    window.addEventListener("cart:updated", refresh);
    return () => window.removeEventListener("cart:updated", refresh);
  }, [restaurant.id, tableKey]);

  // Available products only
  const availableProducts = useMemo(
    () => products.filter((p) => p.available),
    [products]
  );

  // Determine which categories (or their parents) are visible to client
  const visibleCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cat of categories) {
      if (cat.visibleToClient) ids.add(cat.id);
    }
    return ids;
  }, [categories]);

  // Check if a product belongs to a visible category (directly or via parent)
  const isInVisibleCategory = (product: Product) => {
    if (visibleCategoryIds.has(product.categoryId)) return true;
    // Check if the product's category's parent is visible
    const cat = categories.find((c) => c.id === product.categoryId);
    if (cat?.parentId && visibleCategoryIds.has(cat.parentId)) return true;
    return false;
  };

  // SECTION 1: Menu du jour — all daily products
  const dailyProducts = useMemo(
    () => availableProducts.filter((p) => p.isDaily),
    [availableProducts]
  );

  // SECTION 2: Autres plats — non-daily products from non-visible categories
  const otherPlats = useMemo(
    () => availableProducts.filter((p) => !p.isDaily && !isInVisibleCategory(p)),
    [availableProducts, visibleCategoryIds, categories]
  );

  // SECTION 3+: Visible parent categories with their products
  const visibleParents = useMemo(() => {
    return categories
      .filter((c) => c.parentId === null && c.visibleToClient)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  // Products grouped by visible category
  const productsByVisibleCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of availableProducts) {
      const cat = categories.find((c) => c.id === p.categoryId);
      if (!cat) continue;
      // Assign to parent if parent is visible, else to own category if visible
      const targetId = cat.parentId && visibleCategoryIds.has(cat.parentId)
        ? cat.parentId
        : visibleCategoryIds.has(cat.id)
        ? cat.id
        : null;
      if (targetId) {
        if (!map.has(targetId)) map.set(targetId, []);
        map.get(targetId)!.push(p);
      }
    }
    return map;
  }, [availableProducts, categories, visibleCategoryIds]);

  // Build section list for tab navigation
  type MenuSection = { id: string; label: string; count: number };
  const sections = useMemo(() => {
    const list: MenuSection[] = [];
    if (dailyProducts.length > 0) list.push({ id: "daily", label: "Menu du jour", count: dailyProducts.length });
    if (otherPlats.length > 0) list.push({ id: "others", label: "Autres plats", count: otherPlats.length });
    for (const parent of visibleParents) {
      const items = productsByVisibleCategory.get(parent.id) ?? [];
      if (items.length > 0) list.push({ id: parent.id, label: parent.name, count: items.length });
    }
    return list;
  }, [dailyProducts, otherPlats, visibleParents, productsByVisibleCategory]);

  const searchTerm = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchTerm) return null;
    return availableProducts.filter((p) => p.name.toLowerCase().includes(searchTerm));
  }, [availableProducts, searchTerm]);

  const handleAdd = (p: Product) => {
    addToCart(restaurant.id, tableKey, {
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
    });
    setJustAdded(p.id);
    setTimeout(() => setJustAdded((prev) => (prev === p.id ? null : prev)), 600);
  };

  if (!tableNumber && !roomLabel && !deliveryMode) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C8963E]/10 flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-8 h-8 text-[#8a6828]" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-stone-900">
            Table non identifiée
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Scannez le QR code affiché sur votre table pour accéder au menu.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-32">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight truncate">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {deliveryMode ? (
                    <span className="flex items-center gap-1">
                      <span className="text-[#722F37] font-semibold">Livraison</span> · En service
                      {deliveryFee > 0 && <span> · Frais: {formatFCFA(deliveryFee)}</span>}
                    </span>
                  ) : (
                    <>{locationLabel} · En service</>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-9 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Section tabs — scroll to section on tap */}
          {!searchTerm && sections.length > 1 && (
            <div className="mt-4 -mx-5 px-5 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const el = document.getElementById(`section-${s.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-10">
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="text-center py-16 animate-fade-in-up">
              <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden />
              <p className="text-sm text-stone-500">
                Aucun résultat pour &laquo;&nbsp;{search.trim()}&nbsp;&raquo;
              </p>
            </div>
          ) : (
            <section className="animate-fade-in-up">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">
                  Résultats
                </h3>
                <span className="text-[11px] text-stone-400">
                  {searchResults.length} plat{searchResults.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {searchResults.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={() => handleAdd(p)}
                    justAdded={justAdded === p.id}
                    categories={categories}
                    onDetail={(prod) => { setSelectedProduct(prod); setDetailQty(1); }}
                  />
                ))}
              </div>
            </section>
          )
        ) : (
          <>
            {/* Menu du jour */}
            {dailyProducts.length > 0 && (
              <section id="section-daily" className="animate-fade-in-up scroll-mt-40">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" aria-hidden />
                    Menu du jour
                  </h2>
                  <div className="flex-1 h-px bg-amber-200" />
                  <span className="text-xs text-amber-600 font-medium">
                    {dailyProducts.length} plat{dailyProducts.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {dailyProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAdd={() => handleAdd(p)}
                      justAdded={justAdded === p.id}
                      categories={categories}
                      onDetail={(prod) => { setSelectedProduct(prod); setDetailQty(1); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Autres plats */}
            {otherPlats.length > 0 && (
              <section id="section-others" className="animate-fade-in-up scroll-mt-40">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                    Autres plats
                  </h2>
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400 font-medium">
                    {otherPlats.length} plat{otherPlats.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {otherPlats.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAdd={() => handleAdd(p)}
                      justAdded={justAdded === p.id}
                      categories={categories}
                      onDetail={(prod) => { setSelectedProduct(prod); setDetailQty(1); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Visible categories (drinks, etc.) */}
            {visibleParents.map((parent) => {
              const items = productsByVisibleCategory.get(parent.id) ?? [];
              if (items.length === 0) return null;

              // Group by sub-categories if any
              const subs = categories
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => a.order - b.order);

              return (
                <section key={parent.id} id={`section-${parent.id}`} className="animate-fade-in-up scroll-mt-40">
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                      {parent.name}
                    </h2>
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400 font-medium">
                      {items.length} article{items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {subs.length > 0 ? (
                    <div className="space-y-8">
                      {subs.map((sub) => {
                        const subItems = items.filter((p) => p.categoryId === sub.id);
                        if (subItems.length === 0) return null;
                        return (
                          <div key={sub.id}>
                            <div className="flex items-baseline justify-between mb-3">
                              <h3 className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">
                                {sub.name}
                              </h3>
                              <span className="text-[11px] text-stone-400">
                                {subItems.length} article{subItems.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {subItems.map((p) => (
                                <ProductCard
                                  key={p.id}
                                  product={p}
                                  onAdd={() => handleAdd(p)}
                                  justAdded={justAdded === p.id}
                                  categories={categories}
                                  onDetail={(prod) => { setSelectedProduct(prod); setDetailQty(1); }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onAdd={() => handleAdd(p)}
                          justAdded={justAdded === p.id}
                          categories={categories}
                          onDetail={(prod) => { setSelectedProduct(prod); setDetailQty(1); }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Empty state */}
            {dailyProducts.length === 0 && otherPlats.length === 0 && visibleParents.every((p) => (productsByVisibleCategory.get(p.id)?.length ?? 0) === 0) && (
              <div className="text-center py-16 animate-fade-in-up">
                <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden />
                <p className="text-sm text-stone-500">
                  Aucun plat disponible pour le moment.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {count > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-2xl mx-auto animate-fade-in-up">
          <SwipeConfirm
            onConfirm={() =>
              router.push(`/r/${restaurant.slug}/cart?${locationParam}`)
            }
            label={`Voir mon panier · ${formatFCFA(total)}`}
            hint={`${count} article${count > 1 ? "s" : ""} — glissez pour voir le panier`}
          />
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (() => {
        const links = selectedProduct.categoryLinks ?? [];
        const hasProductStock = selectedProduct.stockQuantity !== null;
        const catInsufficient = links.length > 0
          ? links.some((l) => {
              const c = categories.find((ct) => ct.id === l.categoryId);
              return c?.stock !== null && c?.stock !== undefined && c.stock < l.quantityPerUnit;
            })
          : (() => {
              const c = categories.find((ct) => ct.id === selectedProduct.categoryId);
              return c?.stock !== null && c?.stock !== undefined && c.stock < selectedProduct.stockConsumption;
            })();
        const disabled = !selectedProduct.available || catInsufficient
          || (hasProductStock && selectedProduct.stockQuantity! <= 0);
        const remaining = hasProductStock ? selectedProduct.stockQuantity! : 999;
        const maxQty = disabled ? 0 : remaining;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto overflow-hidden animate-fade-in-up">
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-56 sm:h-64 object-cover"
                />
              ) : (
                <div className="w-full h-56 sm:h-64 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                  <UtensilsCrossed className="w-16 h-16 text-stone-300" />
                </div>
              )}

              <div className="p-5 pb-8">
                <h2 className="text-xl font-bold text-stone-900 mb-1">
                  {selectedProduct.name}
                </h2>
                {selectedProduct.description && (
                  <p className="text-sm text-stone-600 mb-3 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
                <div className="text-lg font-bold text-[#722F37] mb-3">
                  {formatFCFA(selectedProduct.price)}
                </div>

                {disabled ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-full px-3 py-1 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Produit indisponible
                  </div>
                ) : remaining !== null && remaining > 0 && remaining <= 5 ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a6828] bg-[#C8963E]/10 rounded-full px-3 py-1 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E]" />
                    Plus que {remaining} disponible{remaining > 1 ? "s" : ""}
                  </div>
                ) : null}

                {!disabled && (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
                      <button
                        onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-full bg-white text-stone-700 shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-stone-900">
                        {detailQty}
                      </span>
                      <button
                        onClick={() => setDetailQty((q) => Math.min(maxQty, q + 1))}
                        className="w-9 h-9 rounded-full bg-[#722F37] text-white hover:bg-[#5a2530] transition-colors flex items-center justify-center"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        for (let i = 0; i < detailQty; i++) handleAdd(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="flex-1 bg-[#722F37] text-white rounded-2xl py-3.5 font-bold text-sm hover:bg-[#5a2530] active:scale-[0.98] transition-all shadow-lg shadow-[#722F37]/30"
                    >
                      Ajouter au panier · {formatFCFA(selectedProduct.price * detailQty)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

function ProductCard({
  product,
  onAdd,
  justAdded,
  categories,
  onDetail,
}: {
  product: Product;
  onAdd: () => void;
  justAdded: boolean;
  categories: Category[];
  onDetail?: (product: Product) => void;
}) {
  const links = product.categoryLinks ?? [];
  const hasProductStock = product.stockQuantity !== null;
  const catInsufficient = links.length > 0
    ? links.some((l) => {
        const cat = categories.find((c) => c.id === l.categoryId);
        return cat?.stock !== null && cat?.stock !== undefined && cat.stock < l.quantityPerUnit;
      })
    : (() => {
        const cat = categories.find((c) => c.id === product.categoryId);
        return cat?.stock !== null && cat?.stock !== undefined && cat.stock < product.stockConsumption;
      })();
  const disabled = !product.available || catInsufficient
    || (hasProductStock && product.stockQuantity! <= 0);
  return (
    <div className={`group relative bg-white rounded-2xl p-3 flex gap-4 items-center border transition-all ${disabled ? "border-stone-200/50" : "border-stone-200/80 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/5"}`}>
      <div
        className="flex gap-4 items-center flex-1 min-w-0 cursor-pointer"
        onClick={() => onDetail?.(product)}
      >
        <div className="relative flex-shrink-0">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className={`w-24 h-24 rounded-xl object-cover bg-stone-100 ${disabled ? "opacity-50" : ""}`}
            />
          ) : (
            <div className={`w-24 h-24 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-400 ${disabled ? "opacity-50" : ""}`}>
              <UtensilsCrossed className="w-8 h-8" aria-hidden />
            </div>
          )}
          {disabled && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm">
                Épuisé
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-1">
          <div className="font-semibold text-stone-900 truncate">
            {product.name}
          </div>
          {product.description && (
            <div className="text-xs text-stone-500 truncate mt-0.5">
              {product.description}
            </div>
          )}
          <div className="mt-1 text-sm font-semibold text-stone-700">
            {formatFCFA(product.price)}
          </div>
          {!disabled && (() => {
            const remaining = hasProductStock ? product.stockQuantity! : null;
            return remaining !== null && remaining > 0 && remaining <= 5 ? (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#8a6828]">
                <span className="w-1 h-1 rounded-full bg-[#C8963E]" />
                Plus que {remaining}
              </div>
            ) : null;
          })()}
        </div>
      </div>
      <button
        onClick={onAdd}
        disabled={disabled}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-sm disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none ${
          justAdded
            ? "bg-emerald-500 text-white scale-110"
            : "bg-[#722F37] text-white hover:bg-[#5a2530] active:scale-95"
        }`}
        aria-label="Ajouter au panier"
      >
        {justAdded ? (
          <Check className="w-5 h-5" aria-hidden />
        ) : (
          <Plus className="w-5 h-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
