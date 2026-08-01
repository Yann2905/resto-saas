"use client";

import { useState, useCallback, useEffect, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, MapPin, Minus, Plus, ShoppingBag, Truck, UtensilsCrossed } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { addToCart, getCart, cartCount, cartTotal } from "@/lib/cart";
import DeliveryNav from "@/app/commander/_components/delivery-nav";

type ProductInfo = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  description: string | null;
};

type RestaurantInfo = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  deliveryFee: number;
  estimatedDeliveryMinutes?: number;
};

type SimilarProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

type Props = {
  product: ProductInfo;
  restaurant: RestaurantInfo;
  categoryName: string;
  similarProducts: SimilarProduct[];
};

export default function ProductDetail({ product, restaurant, categoryName, similarProducts }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartInfo, setCartInfo] = useState({ count: 0, total: 0 });

  const refreshCart = useCallback(() => {
    const items = getCart(restaurant.id, "delivery");
    setCartInfo({ count: cartCount(items), total: cartTotal(items) });
  }, [restaurant.id]);

  useEffect(() => {
    refreshCart();
    window.addEventListener("cart:updated", refreshCart);
    return () => window.removeEventListener("cart:updated", refreshCart);
  }, [refreshCart]);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(restaurant.id, "delivery", {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
    localStorage.setItem("delivery_cart_slug", restaurant.slug);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleAddSimilar = (p: SimilarProduct) => {
    addToCart(restaurant.id, "delivery", {
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
    });
    localStorage.setItem("delivery_cart_slug", restaurant.slug);
  };

  return (
    <main className="min-h-screen bg-[#FFF8F0] pb-20">
      {/* Image */}
      <div className="relative">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} width={800} height={400} priority className="w-full h-72 sm:h-96 object-cover" />
        ) : (
          <div className="w-full h-72 sm:h-96 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
            <UtensilsCrossed className="w-24 h-24 text-amber-200" />
          </div>
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-stone-700 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
          {/* Restaurant */}
          <div className="flex items-center gap-2.5 mb-4">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center">
                <span className="text-sm font-bold text-white">{restaurant.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 text-sm">{restaurant.name}</div>
              <div className="flex items-center gap-3 text-[11px] text-stone-400">
                {restaurant.address && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {restaurant.address}
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <Truck className="w-3 h-3" />
                  {restaurant.deliveryFee > 0 ? formatFCFA(restaurant.deliveryFee) : "Gratuit"}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  ~{restaurant.estimatedDeliveryMinutes ?? 30} min
                </span>
              </div>
            </div>
          </div>

          {/* Category tag */}
          <span className="inline-block bg-[#722F37]/10 text-[#722F37] text-xs font-semibold px-3 py-1 rounded-full mb-3">
            {categoryName}
          </span>

          {/* Name & Price */}
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{product.name}</h1>
          <div className="text-3xl font-bold text-[#722F37] mb-4">{formatFCFA(product.price)}</div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-stone-600 leading-relaxed mb-5">{product.description}</p>
          )}

          {/* Quantity + Add */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-full bg-white text-stone-700 shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-bold text-stone-900 text-lg">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-11 h-11 rounded-full bg-[#722F37] text-white hover:bg-[#5a2530] transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className={`flex-1 rounded-2xl py-4 font-bold text-sm text-center transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] ${
                added
                  ? "bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-[#722F37] text-white hover:bg-[#5a2530] shadow-[#722F37]/30"
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  Ajouté !
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  Ajouter · {formatFCFA(product.price * qty)}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Similar products carousel */}
        {similarProducts.length > 0 && (
          <div className="mt-6">
            <h2 className="font-bold text-stone-900 text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-[#C8963E]" />
              Vous aimerez aussi
            </h2>
            <div className="overflow-x-auto -mx-4 px-4 pb-2">
              <div className="flex gap-3" style={{ width: "max-content" }}>
                {similarProducts.map((p) => (
                  <SimilarCard key={p.id} product={p} onAdd={() => handleAddSimilar(p)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartInfo.count > 0 && (
        <div className="fixed bottom-16 inset-x-4 z-40 max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/r/${restaurant.slug}/cart?mode=delivery`)}
            className="w-full bg-[#722F37] text-white rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-2xl shadow-[#722F37]/40 hover:bg-[#5a2530] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Voir le panier</div>
                <div className="text-[11px] text-white/70">
                  {cartInfo.count} article{cartInfo.count > 1 ? "s" : ""} · {restaurant.name}
                </div>
              </div>
            </div>
            <div className="text-lg font-bold">{formatFCFA(cartInfo.total)}</div>
          </button>
        </div>
      )}

      <DeliveryNav />
    </main>
  );
}

const SimilarCard = memo(function SimilarCard({ product, onAdd }: { product: SimilarProduct; onAdd: () => void }) {
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = () => {
    onAdd();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 800);
  };

  return (
    <div className="w-40 flex-shrink-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
      <Link href={`/commander/produit/${product.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} width={160} height={120} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-amber-300" />
            </div>
          )}
        </div>
      </Link>
      <div className="p-2.5">
        <Link href={`/commander/produit/${product.id}`}>
          <h3 className="font-bold text-stone-900 text-xs leading-tight line-clamp-2 min-h-[2rem] mb-1.5">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#722F37]">{formatFCFA(product.price)}</span>
          <button
            onClick={handleClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              justAdded ? "bg-emerald-500 text-white scale-110" : "bg-[#722F37] text-white hover:bg-[#5a2530] active:scale-95"
            }`}
          >
            {justAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
});
