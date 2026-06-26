import { notFound } from "next/navigation";
import { Moon } from "lucide-react";
import {
  getRestaurantBySlug,
  getCategories,
  getProducts,
  isSubscriptionActive,
} from "@/lib/restaurants-server";
import { isOpenAt, formatTodayHours } from "@/lib/opening-hours";
import { isHotelType } from "@/types";
import MenuClient from "./menu-client";
import HotelLandingClient from "./hotel-landing-client";

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; room?: string }>;
}) {
  const { slug } = await params;
  const { table, room } = await searchParams;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  if (!isSubscriptionActive(restaurant)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">
            Commande en ligne indisponible
          </h1>
          <p className="text-sm text-stone-600 mb-4">
            Le service de commande en ligne de{" "}
            <span className="font-semibold">{restaurant.name}</span>{" "}
            est temporairement suspendu.
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Veuillez appeler un serveur pour passer votre commande. Merci de votre compréhension.
          </div>
        </div>
      </main>
    );
  }

  const open = isOpenAt(restaurant.openingHours);
  if (!open) {
    const label = isHotelType(restaurant.type) ? "Établissement fermé" : "Restaurant fermé";
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center bg-stone-50">
        <div>
          <Moon className="w-14 h-14 mx-auto mb-3 text-stone-500" aria-hidden />
          <h1 className="text-2xl font-bold mb-2">{label}</h1>
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

  const isHotel = isHotelType(restaurant.type);
  const roomLabel = room ? decodeURIComponent(room) : null;
  const tableNumber = table ? parseInt(table, 10) : null;

  if (isHotel && roomLabel) {
    return (
      <HotelLandingClient
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        }}
        categories={categories}
        products={products}
        roomLabel={roomLabel}
        hotelServices={restaurant.hotelServices}
        hotelIssues={restaurant.hotelIssues}
      />
    );
  }

  return (
    <MenuClient
      restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}
      categories={categories}
      products={products}
      tableNumber={tableNumber}
      roomLabel={roomLabel}
    />
  );
}
