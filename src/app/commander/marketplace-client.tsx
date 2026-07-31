"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Minus, Plus, Search, ShoppingBag, Truck, UtensilsCrossed, X } from "lucide-react";
import { formatFCFA } from "@/lib/format";

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

export default function MarketplaceClient({ products, restaurants }: Props) {
  const [search, setSearch] = useState("");
  const [selectedResto, setSelectedResto] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRestaurant | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedResto) {
      result = result.filter((p) => p.restaurant.id === selectedResto);
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
  }, [products, search, selectedResto]);

  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      {/* ── Header ─────────────────────────────────── */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <p className="text-xs text-stone-500">Livraison à domicile</p>
                <h1 className="text-lg font-bold text-stone-900 leading-tight">
                  Qu&apos;est-ce qui vous fait envie ?
                </h1>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#722F37]/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#722F37]" />
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
                onClick={() => setSelectedResto(null)}
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
                  onClick={() => setSelectedResto(r.id === selectedResto ? null : r.id)}
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
              <Link
                href={`/r/${r.slug}?mode=delivery`}
                className="bg-white text-[#722F37] text-xs font-bold px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors flex-shrink-0 shadow-sm"
              >
                Menu complet
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── Products grid ──────────────────────── */}
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
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-900">
                {selectedResto ? "Plats disponibles" : "Tous les plats"}
              </h2>
              <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-3 py-1">
                {filtered.length} plat{filtered.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <button
                  key={`${product.restaurant.id}-${product.id}`}
                  onClick={() => { setSelectedProduct(product); setDetailQty(1); }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left group active:scale-[0.98]"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10 text-amber-300" />
                      </div>
                    )}
                    {/* Price badge */}
                    <div className="absolute bottom-2 left-2 bg-[#722F37] rounded-lg px-2.5 py-1 shadow-lg">
                      <span className="text-xs font-bold text-white">
                        {formatFCFA(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-stone-900 text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    {/* Restaurant */}
                    <div className="flex items-center gap-1.5">
                      {product.restaurant.logoUrl ? (
                        <img
                          src={product.restaurant.logoUrl}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">
                            {product.restaurant.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-stone-500 truncate font-medium">
                        {product.restaurant.name}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Product Detail Modal ───────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto overflow-hidden animate-slide-up sm:animate-none sm:my-8">
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image */}
            {selectedProduct.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-60 sm:h-72 object-cover"
              />
            ) : (
              <div className="w-full h-60 sm:h-72 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
                <UtensilsCrossed className="w-20 h-20 text-amber-200" />
              </div>
            )}

            {/* Content */}
            <div className="p-5 pb-8">
              {/* Restaurant tag */}
              <div className="flex items-center gap-2 mb-3">
                {selectedProduct.restaurant.logoUrl ? (
                  <img src={selectedProduct.restaurant.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{selectedProduct.restaurant.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold text-stone-700">{selectedProduct.restaurant.name}</span>
                  <div className="text-[11px] text-stone-400 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {selectedProduct.restaurant.deliveryFee > 0
                      ? `Livraison : ${formatFCFA(selectedProduct.restaurant.deliveryFee)}`
                      : "Livraison gratuite"}
                  </div>
                </div>
              </div>

              {/* Name & price */}
              <h2 className="text-xl font-bold text-stone-900 mb-1">
                {selectedProduct.name}
              </h2>
              <div className="text-2xl font-bold text-[#722F37] mb-2">
                {formatFCFA(selectedProduct.price)}
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  {selectedProduct.description}
                </p>
              )}

              {/* Quantity + Commander button */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
                  <button
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full bg-white text-stone-700 shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-stone-900 text-lg">
                    {detailQty}
                  </span>
                  <button
                    onClick={() => setDetailQty((q) => q + 1)}
                    className="w-10 h-10 rounded-full bg-[#722F37] text-white hover:bg-[#5a2530] transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Link
                  href={`/r/${selectedProduct.restaurant.slug}?mode=delivery`}
                  className="flex-1 bg-[#722F37] text-white rounded-2xl py-4 font-bold text-sm text-center hover:bg-[#5a2530] active:scale-[0.98] transition-all shadow-lg shadow-[#722F37]/30 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Commander · {formatFCFA(selectedProduct.price * detailQty)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
