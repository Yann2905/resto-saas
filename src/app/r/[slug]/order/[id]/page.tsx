import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants-server";
import OrderTracker from "./order-tracker";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug, id } = await params;
  const { table } = await searchParams;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <OrderTracker
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      orderId={id}
      tableNumber={table ? parseInt(table, 10) : null}
    />
  );
}
