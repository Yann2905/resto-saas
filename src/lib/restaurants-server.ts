import { createSupabaseAdminClient } from "./supabase-admin";
import {
  Restaurant,
  Category,
  Product,
  RestaurantRow,
  CategoryRow,
  ProductRow,
  mapRestaurant,
  mapCategory,
  mapProduct,
} from "@/types";
import { unstable_cache } from "next/cache";

// ── Cache : les données restaurant/menu changent rarement (30s) ──
// On utilise le admin client (service role) pour éviter l'appel à cookies()
// qui rend la page dynamique et non-cacheable.

const REVALIDATE = 30; // secondes

export const getRestaurantBySlug = unstable_cache(
  async (slug: string): Promise<Restaurant | null> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return mapRestaurant(data as RestaurantRow);
  },
  ["restaurant-by-slug"],
  { revalidate: REVALIDATE, tags: ["restaurants"] },
);

export const getCategories = unstable_cache(
  async (restaurantId: string): Promise<Category[]> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("order", { ascending: true });

    if (error || !data) return [];
    return (data as CategoryRow[]).map(mapCategory);
  },
  ["categories"],
  { revalidate: REVALIDATE, tags: ["categories"] },
);

export const getProducts = unstable_cache(
  async (restaurantId: string): Promise<Product[]> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("order", { ascending: true });

    if (error || !data) return [];
    return (data as ProductRow[]).map(mapProduct);
  },
  ["products"],
  { revalidate: REVALIDATE, tags: ["products"] },
);

export function isSubscriptionActive(r: Restaurant): boolean {
  if (!r.active) return false;
  if (!r.subscriptionExpiresAt) return true;
  return new Date(r.subscriptionExpiresAt).getTime() > Date.now();
}
