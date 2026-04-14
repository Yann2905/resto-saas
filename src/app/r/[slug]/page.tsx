import { notFound } from "next/navigation";
import {
  getRestaurantBySlug,
  getCategories,
  getProducts,
  isSubscriptionActive,
} from "@/lib/restaurants";
import MenuClient from "./menu-client";

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table } = await searchParams;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  if (!isSubscriptionActive(restaurant)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Service indisponible</h1>
          <p className="text-gray-600">
            Ce restaurant est temporairement indisponible.
          </p>
        </div>
      </main>
    );
  }

  const [categories, products] = await Promise.all([
    getCategories(restaurant.id),
    getProducts(restaurant.id),
  ]);

  const tableNumber = table ? parseInt(table, 10) : null;

  return (
    <MenuClient
      restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}
      categories={categories}
      products={products}
      tableNumber={tableNumber}
    />
  );
}
