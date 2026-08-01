import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants-server";
import OrderTracker from "./order-tracker";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ table?: string; room?: string; mode?: string }>;
}) {
  const { slug, id } = await params;
  const { table, room, mode } = await searchParams;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <OrderTracker
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      restaurantLogoUrl={restaurant.logoUrl ?? null}
      orderId={id}
      tableNumber={table ? parseInt(table, 10) : null}
      roomLabel={room ? decodeURIComponent(room) : null}
      deliveryMode={mode === "delivery"}
    />
  );
}
