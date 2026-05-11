import { notFound } from "next/navigation";
import { Moon } from "lucide-react";
import {
  getRestaurantBySlug,
  getCategories,
  getProducts,
  isSubscriptionActive,
} from "@/lib/restaurants-server";
import { isOpenAt, formatTodayHours } from "@/lib/opening-hours";
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

  const open = isOpenAt(restaurant.openingHours);
  if (!open) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center bg-stone-50">
        <div>
          <Moon className="w-14 h-14 mx-auto mb-3 text-stone-500" aria-hidden />
          <h1 className="text-2xl font-bold mb-2">Restaurant fermé</h1>
          <p className="text-stone-600 mb-1">
            Nous serons heureux de vous accueillir bientôt.
          </p>
          <p className="text-sm text-stone-500">
            {formatTodayHours(restaurant.openingHours)}
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
