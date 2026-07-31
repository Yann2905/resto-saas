import Link from "next/link";
import { ArrowLeft, MapPin, Search, Truck, UtensilsCrossed } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { RestaurantRow, ProductRow, mapRestaurant, mapProduct } from "@/types";
import { isSubscriptionActive } from "@/lib/restaurants-server";
import { formatFCFA } from "@/lib/format";
import MarketplaceClient from "./marketplace-client";

export const revalidate = 60;

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

export default async function CommanderPage() {
  const supabase = createSupabaseAdminClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .eq("delivery_enabled", true);

  if (!restaurants || restaurants.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-stone-500 hover:text-stone-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-stone-900">Commander</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
            <Truck className="w-10 h-10 text-stone-300" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Bientôt disponible</h2>
          <p className="text-sm text-stone-500 max-w-xs">
            Aucun restaurant ne propose la livraison pour le moment. Revenez bientôt !
          </p>
        </div>
      </main>
    );
  }

  const activeRestaurants = (restaurants as RestaurantRow[])
    .map(mapRestaurant)
    .filter(isSubscriptionActive);

  if (activeRestaurants.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-stone-500 hover:text-stone-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-stone-900">Commander</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
            <Truck className="w-10 h-10 text-stone-300" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Bientôt disponible</h2>
          <p className="text-sm text-stone-500 max-w-xs">
            Aucun restaurant ne propose la livraison pour le moment. Revenez bientôt !
          </p>
        </div>
      </main>
    );
  }

  const restaurantIds = activeRestaurants.map((r) => r.id);

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .in("restaurant_id", restaurantIds)
    .eq("available", true)
    .order("created_at", { ascending: false });

  const restMap = new Map(activeRestaurants.map((r) => [r.id, r]));

  const allProducts: ProductWithRestaurant[] = ((products as ProductRow[]) ?? [])
    .map((p) => {
      const mapped = mapProduct(p);
      const rest = restMap.get(mapped.restaurantId);
      if (!rest) return null;
      return {
        id: mapped.id,
        name: mapped.name,
        price: mapped.price,
        imageUrl: mapped.imageUrl ?? null,
        description: mapped.description,
        restaurant: {
          id: rest.id,
          slug: rest.slug,
          name: rest.name,
          logoUrl: rest.logoUrl ?? null,
          deliveryFee: rest.deliveryFee,
          address: rest.address ?? null,
        },
      };
    })
    .filter(Boolean) as ProductWithRestaurant[];

  const restaurantList = activeRestaurants.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logoUrl ?? null,
    deliveryFee: r.deliveryFee,
    address: r.address ?? null,
  }));

  return <MarketplaceClient products={allProducts} restaurants={restaurantList} />;
}
