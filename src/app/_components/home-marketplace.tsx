"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Search, ShoppingBag, Truck, UtensilsCrossed, X } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { addToCart, getCart, cartCount, cartTotal, clearCart } from "@/lib/cart";
import DeliveryNav from "@/app/commander/_components/delivery-nav";

type RestaurantInfo = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  deliveryFee: number;
  address: string | null;
};

type ProductWithRestaurant = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  description: string | null;
  restaurant: RestaurantInfo;
};

type Props = {
  products: ProductWithRestaurant[];
  restaurants: RestaurantInfo[];
};

export default function HomeMarketplace({ products, restaurants }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedResto, setSelectedResto] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRestaurant | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let result = products;
    if (selectedResto) result = result.filter((p) => p.restaurant.id === selectedResto);
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((p) => p.name.toLowerCase().includes(term) || p.restaurant.name.toLowerCase().includes(term));
    return result;
  }, [products, search, selectedResto]);

  if (products.length === 0) {
    return (
      <section id="commander" className="relative z-10 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-stone-500" />
          </div>
          <h3 className="text-lg font-bold text-stone-300 mb-1">Bientôt disponible</h3>
          <p className="text-sm text-stone-500">Aucun restaurant ne propose encore la livraison.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="commander" className="relative z-10 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat, un restaurant…"
              className="w-full rounded-2xl border border-stone-700 bg-stone-900/80 pl-10 pr-10 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:bg-stone-900 focus:border-[#C8963E]/50 focus:ring-2 focus:ring-[#C8963E]/20 focus:outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Restaurant chips */}
          {restaurants.length > 0 && (
            <div className="overflow-x-auto mb-5 -mx-4 px-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedResto(null)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                    !selectedResto ? "bg-[#C8963E] text-white shadow-sm" : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                  }`}
                >
                  Tout voir
                </button>
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedResto(r.id === selectedResto ? null : r.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                      selectedResto === r.id ? "bg-[#C8963E] text-white shadow-sm" : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                    }`}
                  >
                    {r.logoUrl ? (
                      <img src={r.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#722F37] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{r.name.charAt(0)}</span>
                      </div>
                    )}
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="font-semibold text-stone-400">{search ? `Aucun résultat pour « ${search.trim()} »` : "Aucun plat disponible"}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-stone-100">{selectedResto ? "Plats disponibles" : "Tous les plats"}</h2>
                <span className="text-xs text-stone-500 bg-stone-800 rounded-full px-3 py-1">{filtered.length} plat{filtered.length > 1 ? "s" : ""}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filtered.map((product) => (
                  <div key={`${product.restaurant.id}-${product.id}`} className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden hover:border-stone-700 transition-all group">
                    <button onClick={() => { setSelectedProduct(product); setDetailQty(1); }} className="w-full text-left">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                            <UtensilsCrossed className="w-10 h-10 text-stone-600" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-[#C8963E] rounded-lg px-2.5 py-1 shadow-lg">
                          <span className="text-xs font-bold text-white">{formatFCFA(product.price)}</span>
                        </div>
                      </div>
                    </button>
                    <div className="p-3">
                      <button onClick={() => { setSelectedProduct(product); setDetailQty(1); }} className="text-left w-full">
                        <h3 className="font-bold text-stone-100 text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">{product.name}</h3>
                      </button>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {product.restaurant.logoUrl ? (
                            <img src={product.restaurant.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#722F37] flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] font-bold text-white">{product.restaurant.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="text-[11px] text-stone-500 truncate font-medium">{product.restaurant.name}</span>
                        </div>
                        <button
                          onClick={() => handleAdd(product)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                            justAdded === product.id ? "bg-emerald-500 text-white scale-110" : "bg-[#C8963E] text-white hover:bg-[#d4a94e] active:scale-95"
                          }`}
                        >
                          {justAdded === product.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Floating cart bar */}
      {count > 0 && activeCartResto && (
        <div className="fixed bottom-16 inset-x-4 z-40 max-w-3xl mx-auto">
          <button
            onClick={() => router.push(`/r/${activeCartResto.slug}/cart?mode=delivery`)}
            className="w-full bg-[#C8963E] text-white rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-2xl shadow-[#C8963E]/40 hover:bg-[#d4a94e] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Voir le panier</div>
                <div className="text-[11px] text-white/70">{count} article{count > 1 ? "s" : ""} · {activeCartResto.name}</div>
              </div>
            </div>
            <div className="text-lg font-bold">{formatFCFA(total)}</div>
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-stone-700" style={{ animation: "fadeInDown 0.3s ease-out" }}>
            <Check className="w-4 h-4 text-emerald-400" />
            {toast}
          </div>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-stone-950 border border-stone-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto overflow-hidden sm:my-8" style={{ animation: "slideUp 0.3s ease-out" }}>
            <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
            {selectedProduct.imageUrl ? (
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-60 sm:h-72 object-cover" />
            ) : (
              <div className="w-full h-60 sm:h-72 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                <UtensilsCrossed className="w-20 h-20 text-stone-600" />
              </div>
            )}
            <div className="p-5 pb-8">
              <div className="flex items-center gap-2 mb-3">
                {selectedProduct.restaurant.logoUrl ? (
                  <img src={selectedProduct.restaurant.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#722F37] flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{selectedProduct.restaurant.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold text-stone-300">{selectedProduct.restaurant.name}</span>
                  <div className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {selectedProduct.restaurant.deliveryFee > 0 ? `Livraison : ${formatFCFA(selectedProduct.restaurant.deliveryFee)}` : "Livraison gratuite"}
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{selectedProduct.name}</h2>
              <div className="text-2xl font-bold text-[#C8963E] mb-2">{formatFCFA(selectedProduct.price)}</div>
              {selectedProduct.description && <p className="text-sm text-stone-400 leading-relaxed mb-4">{selectedProduct.description}</p>}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1 bg-stone-800 rounded-full p-1">
                  <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-white text-lg">{detailQty}</span>
                  <button onClick={() => setDetailQty((q) => q + 1)} className="w-10 h-10 rounded-full bg-[#C8963E] text-white hover:bg-[#d4a94e] transition-colors flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => { handleAdd(selectedProduct, detailQty); setSelectedProduct(null); }}
                  className="flex-1 bg-[#C8963E] text-white rounded-2xl py-4 font-bold text-sm text-center hover:bg-[#d4a94e] active:scale-[0.98] transition-all shadow-lg shadow-[#C8963E]/30 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ajouter · {formatFCFA(selectedProduct.price * detailQty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <DeliveryNav cartCount={count} activeTab="home" />

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
