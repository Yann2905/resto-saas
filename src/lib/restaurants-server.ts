import { createSupabaseServerClient } from "./supabase-server";
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

export async function getRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapRestaurant(data as RestaurantRow);
}

export async function getCategories(
  restaurantId: string
): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return (data as CategoryRow[]).map(mapCategory);
}

export async function getProducts(
  restaurantId: string
): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order", { ascending: true });

  if (error || !data) return [];
  return (data as ProductRow[]).map(mapProduct);
}

export function isSubscriptionActive(r: Restaurant): boolean {
  if (!r.active) return false;
  if (!r.subscriptionExpiresAt) return true;
  return new Date(r.subscriptionExpiresAt).getTime() > Date.now();
}
