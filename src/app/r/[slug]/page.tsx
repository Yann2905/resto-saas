import { notFound } from "next/navigation";
import { Moon, QrCode, Truck } from "lucide-react";
import { formatFCFA } from "@/lib/format";
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
  searchParams: Promise<{ table?: string; room?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const { table, room, mode } = await searchParams;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  if (!isSubscriptionActive(restaurant)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C8963E]/10 flex items-center justify-center mx-auto mb-4">
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
          <div className="rounded-xl border border-[#e0c07a] bg-[#C8963E]/5 p-4 text-sm text-[#6e5a20]">
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
          logoUrl: restaurant.logoUrl ?? null,
        }}
        categories={categories}
        products={products}
        roomLabel={roomLabel}
        hotelServices={restaurant.hotelServices}
        hotelIssues={restaurant.hotelIssues}
      />
    );
  }

  const isDeliveryMode = mode === "delivery" && restaurant.deliveryEnabled;

  if (isDeliveryMode) {
    return (
      <MenuClient
        restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug, logoUrl: restaurant.logoUrl ?? null }}
        categories={categories}
        products={products}
        tableNumber={null}
        roomLabel={null}
        deliveryMode
        deliveryFee={restaurant.deliveryFee}
      />
    );
  }

  if (!tableNumber && !roomLabel) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="max-w-sm w-full text-center">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-3xl font-bold text-white">{restaurant.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{restaurant.name}</h1>
          <p className="text-sm text-stone-500 mb-8">Bienvenue ! Comment souhaitez-vous commander ?</p>

          <div className="space-y-3">
            <a
              href="#"
              className="flex items-center gap-4 w-full bg-white border border-stone-200 rounded-2xl p-4 text-left hover:border-[#722F37] hover:shadow-md transition-all group"
              onClick={(e) => e.preventDefault()}
            >
              <div className="w-12 h-12 rounded-xl bg-[#C8963E]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#722F37]/10 transition-colors">
                <QrCode className="w-6 h-6 text-[#8a6828] group-hover:text-[#722F37] transition-colors" />
              </div>
              <div>
                <div className="font-semibold text-stone-900">Sur place</div>
                <div className="text-xs text-stone-500">Scannez le QR code sur votre table</div>
              </div>
            </a>

            {restaurant.deliveryEnabled && (
              <a
                href={`/r/${restaurant.slug}?mode=delivery`}
                className="flex items-center gap-4 w-full bg-white border border-stone-200 rounded-2xl p-4 text-left hover:border-[#722F37] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#722F37]/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-[#722F37]" />
                </div>
                <div>
                  <div className="font-semibold text-stone-900">Livraison à domicile</div>
                  <div className="text-xs text-stone-500">
                    {restaurant.deliveryFee > 0
                      ? `Frais de livraison : ${formatFCFA(restaurant.deliveryFee)}`
                      : "Livraison gratuite"}
                  </div>
                </div>
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <MenuClient
      restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug, logoUrl: restaurant.logoUrl ?? null }}
      categories={categories}
      products={products}
      tableNumber={tableNumber}
      roomLabel={roomLabel}
    />
  );
}
