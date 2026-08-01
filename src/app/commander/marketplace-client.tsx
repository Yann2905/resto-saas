"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Check, MapPin, Menu, Plus, Search, ShoppingBag, Truck, UtensilsCrossed, X } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { addToCart, getCart, cartCount, cartTotal, clearCart } from "@/lib/cart";
import DeliveryNav from "./_components/delivery-nav";

type RestaurantInfo = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  deliveryFee: number;
  address: string | null;
};

type CategoryInfo = {
  id: string;
  name: string;
  order: number;
};

type ProductWithRestaurant = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  description: string | null;
  categoryId: string;
  categoryName: string;
  productOrder: number;
  restaurant: RestaurantInfo;
};

type Props = {
  products: ProductWithRestaurant[];
  restaurants: RestaurantInfo[];
  categories?: CategoryInfo[];
};

export default function MarketplaceClient({ products, restaurants, categories = [] }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedResto, setSelectedResto] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart state — track for the active restaurant in cart
  const [activeCartResto, setActiveCartResto] = useState<RestaurantInfo | null>(null);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const refreshCart = useCallback(() => {
    for (const r of restaurants) {
      const items = getCart(r.id, "delivery");
      if (items.length > 0) {
        setActiveCartResto(r);
        setCount(cartCount(items));
        setTotal(cartTotal(items));
        return;
      }
    }
    setActiveCartResto(null);
    setCount(0);
    setTotal(0);
  }, [restaurants]);

  useEffect(() => {
    refreshCart();
    window.addEventListener("cart:updated", refreshCart);
    return () => window.removeEventListener("cart:updated", refreshCart);
  }, [refreshCart]);

  const handleAdd = (product: ProductWithRestaurant, qty: number = 1) => {
    // If cart has items from a different restaurant, warn
    if (activeCartResto && activeCartResto.id !== product.restaurant.id) {
      const confirm = window.confirm(
        `Votre panier contient des articles de ${activeCartResto.name}. Voulez-vous vider le panier et commander chez ${product.restaurant.name} ?`
      );
      if (!confirm) return;
      clearCart(activeCartResto.id, "delivery");
    }

    for (let i = 0; i < qty; i++) {
      addToCart(product.restaurant.id, "delivery", {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }

    localStorage.setItem("delivery_cart_slug", product.restaurant.slug);

    setJustAdded(product.id);
    setTimeout(() => setJustAdded((prev) => (prev === product.id ? null : prev)), 800);

    setToast(`${product.name} ajouté au panier`);
    setTimeout(() => setToast(null), 2000);
  };

  const restoCategories = useMemo(() => {
    if (!selectedResto) return [];
    const catIds = new Set<string>();
    for (const p of products) {
      if (p.restaurant.id === selectedResto) catIds.add(p.categoryId);
    }
    const catOrderMap = new Map(categories.map((c) => [c.id, c.order]));
    return Array.from(catIds)
      .map((id) => ({ id, name: categories.find((c) => c.id === id)?.name ?? products.find((p) => p.categoryId === id)?.categoryName ?? "Autres", order: catOrderMap.get(id) ?? 999 }))
      .sort((a, b) => a.order - b.order);
  }, [products, selectedResto, categories]);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedResto) {
      result = result.filter((p) => p.restaurant.id === selectedResto);
      if (selectedCategory) {
        result = result.filter((p) => p.categoryId === selectedCategory);
      }
    }
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.restaurant.name.toLowerCase().includes(term)
      );
    }
    return result;
  }, [products, search, selectedResto, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    if (!selectedResto || selectedCategory || search.trim()) return null;
    const map = new Map<string, ProductWithRestaurant[]>();
    for (const p of filtered) {
      if (!map.has(p.categoryId)) map.set(p.categoryId, []);
      map.get(p.categoryId)!.push(p);
    }
    const catOrderMap = new Map(categories.map((c) => [c.id, c.order]));
    return Array.from(map.entries())
      .sort(([a], [b]) => (catOrderMap.get(a) ?? 999) - (catOrderMap.get(b) ?? 999))
      .map(([, items]) => ({ categoryName: items[0].categoryName, items }));
  }, [filtered, selectedResto, selectedCategory, search, categories]);

  return (
    <main className="min-h-screen bg-[#FFF8F0] pb-20">
      {/* ── Header ─────────────────────────────────── */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Image src="/icon-192.png" alt="Resto SaaS" width={36} height={36} className="rounded-xl shadow-sm" priority />
              <div>
                <h1 className="text-lg font-bold text-stone-900 leading-tight">
                  Resto SaaS
                </h1>
                <p className="text-[11px] text-stone-500">Livraison à domicile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && activeCartResto && (
                <button
                  onClick={() => router.push(`/r/${activeCartResto.slug}/cart?mode=delivery`)}
                  className="relative w-10 h-10 rounded-full bg-[#722F37]/10 flex items-center justify-center hover:bg-[#722F37]/20 transition-colors"
                >
                  <ShoppingBag className="w-5 h-5 text-[#722F37]" />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#722F37] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {count}
                  </span>
                </button>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat, un restaurant…"
              className="w-full rounded-2xl border-0 bg-stone-100 pl-10 pr-10 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-[#722F37]/20 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Restaurant chips */}
        {restaurants.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 pb-3 overflow-x-auto">
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedResto(null); setSelectedCategory(null); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                  !selectedResto
                    ? "bg-[#722F37] text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Tout voir
              </button>
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedResto(r.id === selectedResto ? null : r.id); setSelectedCategory(null); }}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                    selectedResto === r.id
                      ? "bg-[#722F37] text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-white/50" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#C8963E] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{r.name.charAt(0)}</span>
                    </div>
                  )}
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Restaurant banner when filtered ─────── */}
      {selectedResto && (() => {
        const r = restaurants.find((r) => r.id === selectedResto);
        if (!r) return null;
        return (
          <div className="max-w-3xl mx-auto px-4 pt-4">
            <div className="bg-gradient-to-r from-[#722F37] to-[#8a3a42] rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-[#722F37]/20">
              {r.logoUrl ? (
                <img src={r.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/20 shadow-md" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {r.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-base">{r.name}</div>
                {r.address && (
                  <div className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {r.address}
                  </div>
                )}
                <div className="text-xs text-white/90 font-medium mt-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {r.deliveryFee > 0 ? `Livraison : ${formatFCFA(r.deliveryFee)}` : "Livraison gratuite"}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Category chips (when restaurant selected) ── */}
      {selectedResto && restoCategories.length > 1 && (
        <div className="max-w-3xl mx-auto px-4 pt-3 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                !selectedCategory ? "bg-[#C8963E] text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              Tout
            </button>
            {restoCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                  selectedCategory === cat.id ? "bg-[#C8963E] text-white shadow-sm" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Products ──────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-stone-300" />
            </div>
            <p className="font-semibold text-stone-700 mb-1">
              {search ? `Aucun résultat pour « ${search.trim()} »` : "Aucun plat disponible"}
            </p>
            <p className="text-sm text-stone-400">Essayez un autre terme de recherche</p>
          </div>
        ) : groupedByCategory ? (
          /* Grouped by category view */
          <div className="space-y-6">
            {groupedByCategory.map((group) => (
              <div key={group.categoryName}>
                <h2 className="font-bold text-stone-900 text-lg mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-[#722F37]" />
                  {group.categoryName}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={() => handleAdd(product)} added={justAdded === product.id} showRestaurant={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat grid view */
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-900">
                {selectedResto && selectedCategory ? restoCategories.find((c) => c.id === selectedCategory)?.name ?? "Plats" : selectedResto ? "Plats disponibles" : "Tous les plats"}
              </h2>
              <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-3 py-1">
                {filtered.length} plat{filtered.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <ProductCard key={`${product.restaurant.id}-${product.id}`} product={product} onAdd={() => handleAdd(product)} added={justAdded === product.id} showRestaurant={!selectedResto} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Floating cart bar ──────────────────── */}
      {count > 0 && activeCartResto && (
        <div className="fixed bottom-16 inset-x-4 z-40 max-w-3xl mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <button
            onClick={() => router.push(`/r/${activeCartResto.slug}/cart?mode=delivery`)}
            className="w-full bg-[#722F37] text-white rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-2xl shadow-[#722F37]/40 hover:bg-[#5a2530] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Voir le panier</div>
                <div className="text-[11px] text-white/70">
                  {count} article{count > 1 ? "s" : ""} · {activeCartResto.name}
                </div>
              </div>
            </div>
            <div className="text-lg font-bold">
              {formatFCFA(total)}
            </div>
          </button>
        </div>
      )}

      {/* ── Toast notification ─────────────────── */}
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center pointer-events-none animate-fade-in-up">
          <div className="bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toast}
          </div>
        </div>
      )}

      {/* ── Hamburger Menu ─────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-2xl flex flex-col" style={{ animation: "slideInRight 0.25s ease-out" }}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Image src="/icon-192.png" alt="Resto SaaS" width={28} height={28} className="rounded-lg" />
                <span className="font-bold text-stone-900 text-sm">Resto SaaS</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-1">
              <Link href="/dashboard/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors">
                Connexion restaurant
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </Link>
              <a href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant." target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors">
                Restaurateur ? Démarrer ici
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </a>
              <div className="border-t border-stone-100 my-3" />
              <Link href="/a-propos" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-stone-500 text-sm hover:bg-stone-50 transition-colors">
                À propos
              </Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-stone-500 text-sm hover:bg-stone-50 transition-colors">
                Contact
              </Link>
              <Link href="/cgu" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-stone-500 text-sm hover:bg-stone-50 transition-colors">
                CGU
              </Link>
            </div>
            <div className="p-4 border-t border-stone-100">
              <a
                href="https://wa.me/2250575343846"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 text-sm hover:bg-emerald-500 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ─────────────────────────── */}
      <DeliveryNav cartCount={count} activeTab="home" />

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </main>
  );
}

function ProductCard({
  product,
  onAdd,
  added,
  showRestaurant,
}: {
  product: ProductWithRestaurant;
  onAdd: () => void;
  added: boolean;
  showRestaurant: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
      <Link href={`/commander/produit/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-amber-300" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-[#722F37] rounded-lg px-2.5 py-1 shadow-lg">
            <span className="text-xs font-bold text-white">{formatFCFA(product.price)}</span>
          </div>
        </div>
        <div className="p-3 pb-1">
          <h3 className="font-bold text-stone-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          {showRestaurant ? (
            <div className="flex items-center gap-1.5 min-w-0">
              {product.restaurant.logoUrl ? (
                <img src={product.restaurant.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-bold text-white">{product.restaurant.name.charAt(0)}</span>
                </div>
              )}
              <span className="text-[11px] text-stone-500 truncate font-medium">{product.restaurant.name}</span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-[#722F37]">{formatFCFA(product.price)}</span>
          )}
          <button
            onClick={onAdd}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
              added ? "bg-emerald-500 text-white scale-110" : "bg-[#722F37] text-white hover:bg-[#5a2530] active:scale-95"
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
