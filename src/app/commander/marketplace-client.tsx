"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Search, Truck, UtensilsCrossed, X, SlidersHorizontal } from "lucide-react";
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

  const selectedRestaurant = selectedResto
    ? restaurants.find((r) => r.id === selectedResto)
    : null;

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#722F37] to-[#5a2530] flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-stone-900 leading-tight">Commander</h1>
                <p className="text-[11px] text-stone-500">
                  {restaurants.length} restaurant{restaurants.length > 1 ? "s" : ""} · Livraison à domicile
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat ou un restaurant…"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-9 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Restaurant filter chips */}
          {restaurants.length > 1 && (
            <div className="mt-3 -mx-4 px-4 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                <button
                  onClick={() => setSelectedResto(null)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                    !selectedResto
                      ? "bg-[#722F37] text-white shadow-sm"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  Tous
                </button>
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedResto(r.id === selectedResto ? null : r.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
                      selectedResto === r.id
                        ? "bg-[#722F37] text-white shadow-sm"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {r.logoUrl ? (
                      <img src={r.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : null}
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Selected restaurant banner */}
      {selectedRestaurant && (
        <div className="bg-[#722F37]/5 border-b border-[#722F37]/10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            {selectedRestaurant.logoUrl ? (
              <img
                src={selectedRestaurant.logoUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {selectedRestaurant.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-stone-900">{selectedRestaurant.name}</div>
              {selectedRestaurant.address && (
                <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {selectedRestaurant.address}
                </div>
              )}
              <div className="text-xs text-[#722F37] font-medium mt-0.5">
                <Truck className="w-3 h-3 inline mr-1" />
                {selectedRestaurant.deliveryFee > 0
                  ? `Livraison : ${formatFCFA(selectedRestaurant.deliveryFee)}`
                  : "Livraison gratuite"}
              </div>
            </div>
            <Link
              href={`/r/${selectedRestaurant.slug}?mode=delivery`}
              className="bg-[#722F37] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#5a2530] transition-colors flex-shrink-0"
            >
              Voir le menu
            </Link>
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              {search
                ? `Aucun résultat pour « ${search.trim()} »`
                : "Aucun plat disponible"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400 mb-4">
              {filtered.length} plat{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((product) => (
                <Link
                  key={`${product.restaurant.id}-${product.id}`}
                  href={`/r/${product.restaurant.slug}?mode=delivery`}
                  className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5 transition-all"
                >
                  {/* Product image */}
                  <div className="relative aspect-square overflow-hidden bg-stone-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10 text-stone-300" />
                      </div>
                    )}
                    {/* Price badge */}
                    <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
                      <span className="text-sm font-bold text-[#722F37]">
                        {formatFCFA(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-stone-900 text-sm leading-tight line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-stone-500 line-clamp-1 mb-2">
                        {product.description}
                      </p>
                    )}
                    {/* Restaurant info */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100">
                      {product.restaurant.logoUrl ? (
                        <img
                          src={product.restaurant.logoUrl}
                          alt=""
                          className="w-5 h-5 rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white">
                            {product.restaurant.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-stone-500 truncate">
                        {product.restaurant.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
