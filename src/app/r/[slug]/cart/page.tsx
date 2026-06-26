import { notFound } from "next/navigation";
import { getRestaurantBySlug, isSubscriptionActive } from "@/lib/restaurants-server";
import CartClient from "./cart-client";

export default async function CartPage({
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
  if (!isSubscriptionActive(restaurant)) notFound();

  const tableNumber = table ? parseInt(table, 10) : null;
  const roomLabel = room ? decodeURIComponent(room) : null;
  if (!tableNumber && !roomLabel) notFound();

  return (
    <CartClient
      restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}
      tableNumber={tableNumber}
      roomLabel={roomLabel}
    />
  );
}
