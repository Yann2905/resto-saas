"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, QrCode, Search, UtensilsCrossed, X } from "lucide-react";
import { Category, Product } from "@/types";
import { formatFCFA } from "@/lib/format";
import { addToCart, cartCount, cartTotal, getCart } from "@/lib/cart";
import SwipeConfirm from "./_components/swipe-confirm";

type Props = {
  restaurant: { id: string; name: string; slug: string };
  categories: Category[];
  products: Product[];
  tableNumber: number | null;
};

export default function MenuClient({
  restaurant,
  categories,
  products,
  tableNumber,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const tableKey = tableNumber ? String(tableNumber) : "na";

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

  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories]
  );

  useEffect(() => {
    if (!activeParent && parentCategories.length > 0) {
      setActiveParent(parentCategories[0].id);
    }
  }, [activeParent, parentCategories]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!map.has(p.categoryId)) map.set(p.categoryId, []);
      map.get(p.categoryId)!.push(p);
    }
    return map;
  }, [products]);

  const subCategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const searchTerm = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchTerm) return null;
    return products.filter(
      (p) =>
        p.available &&
        p.name.toLowerCase().includes(searchTerm)
    );
  }, [products, searchTerm]);

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

  if (!tableNumber) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-8 h-8 text-amber-700" aria-hidden />
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

  const visibleParents =
    activeParent === null
      ? parentCategories
      : parentCategories.filter((p) => p.id === activeParent);

  return (
    <main className="min-h-screen bg-stone-50 pb-32">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Table {tableNumber} · En service
              </p>
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-9 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-colors"
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

          {!searchTerm && parentCategories.length > 1 && (
            <div className="mt-4 -mx-5 px-5 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {parentCategories.map((p) => {
                  const active = activeParent === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveParent(p.id)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-stone-900 text-white shadow-sm"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
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
                  />
                ))}
              </div>
            </section>
          )
        ) : (
          visibleParents.map((parent) => {
            const subs = subCategories(parent.id);
            const displayCats = subs.length > 0 ? subs : [parent];
            return (
              <section key={parent.id} className="animate-fade-in-up">
                <div className="space-y-8">
                  {displayCats.map((cat) => {
                    const items = productsByCategory.get(cat.id) ?? [];
                    if (items.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-baseline justify-between mb-3">
                          <h3 className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">
                            {cat.name}
                          </h3>
                          <span className="text-[11px] text-stone-400">
                            {items.length} plat{items.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {items.map((p) => (
                            <ProductCard
                              key={p.id}
                              product={p}
                              onAdd={() => handleAdd(p)}
                              justAdded={justAdded === p.id}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {count > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-2xl mx-auto animate-fade-in-up">
          <SwipeConfirm
            onConfirm={() =>
              router.push(`/r/${restaurant.slug}/cart?table=${tableNumber}`)
            }
            label={`Voir mon panier · ${formatFCFA(total)}`}
            hint={`${count} article${count > 1 ? "s" : ""} — glissez pour voir le panier`}
          />
        </div>
      )}
    </main>
  );
}

function ProductCard({
  product,
  onAdd,
  justAdded,
}: {
  product: Product;
  onAdd: () => void;
  justAdded: boolean;
}) {
  const disabled = !product.available || product.stockQuantity <= 0;
  return (
    <div className="group relative bg-white rounded-2xl p-3 flex gap-4 items-center border border-stone-200/80 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/5 transition-all">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-stone-100"
        />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex-shrink-0 flex items-center justify-center text-stone-400">
          <UtensilsCrossed className="w-8 h-8" aria-hidden />
        </div>
      )}
      <div className="flex-1 min-w-0 py-1">
        <div className="font-semibold text-stone-900 truncate">
          {product.name}
        </div>
        <div className="mt-1 text-sm font-semibold text-stone-700">
          {formatFCFA(product.price)}
        </div>
        {disabled ? (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            Indisponible
          </div>
        ) : (
          product.stockQuantity <= 5 && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              Plus que {product.stockQuantity}
            </div>
          )
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={disabled}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-sm disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none ${
          justAdded
            ? "bg-emerald-500 text-white scale-110"
            : "bg-stone-900 text-white hover:bg-stone-800 active:scale-95"
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
