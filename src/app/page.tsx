import { Truck } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { RestaurantRow, ProductRow, mapRestaurant, mapProduct } from "@/types";
import { isSubscriptionActive } from "@/lib/restaurants-server";
import MarketplaceClient from "./commander/marketplace-client";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createSupabaseAdminClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .eq("delivery_enabled", true);

  if (!restaurants || restaurants.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
          <Truck className="w-10 h-10 text-stone-300" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Bientôt disponible</h2>
        <p className="text-sm text-stone-500 max-w-xs">
          Aucun restaurant ne propose la livraison pour le moment. Revenez bientôt !
        </p>
      </main>
    );
  }

  const activeRestaurants = (restaurants as RestaurantRow[])
    .map(mapRestaurant)
    .filter(isSubscriptionActive);

  if (activeRestaurants.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center mb-4">
          <Truck className="w-10 h-10 text-stone-300" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Bientôt disponible</h2>
        <p className="text-sm text-stone-500 max-w-xs">
          Aucun restaurant ne propose la livraison pour le moment. Revenez bientôt !
        </p>
      </main>
    );
  }

  const restaurantIds = activeRestaurants.map((r) => r.id);

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .in("restaurant_id", restaurantIds)
      .eq("available", true)
      .order("order", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, restaurant_id, \"order\"")
      .in("restaurant_id", restaurantIds)
      .order("order", { ascending: true }),
  ]);

  const catMap = new Map((categories ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const restMap = new Map(activeRestaurants.map((r) => [r.id, r]));

  type MarketProduct = {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    description: string | null;
    categoryId: string;
    categoryName: string;
    productOrder: number;
    restaurant: { id: string; slug: string; name: string; logoUrl: string | null; deliveryFee: number; address: string | null };
  };

  const allProducts: MarketProduct[] = ((products as ProductRow[]) ?? [])
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
        categoryId: mapped.categoryId,
        categoryName: catMap.get(mapped.categoryId) ?? "Autres",
        productOrder: mapped.order,
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
    .filter(Boolean) as MarketProduct[];

  const restaurantList = activeRestaurants.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logoUrl ?? null,
    deliveryFee: r.deliveryFee,
    address: r.address ?? null,
  }));

  const categoryList = (categories ?? []).map((c: { id: string; name: string; order: number }) => ({
    id: c.id,
    name: c.name,
    order: c.order ?? 0,
  }));

  return <MarketplaceClient products={allProducts} restaurants={restaurantList} categories={categoryList} />;
}
