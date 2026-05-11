import { notFound } from "next/navigation";
import { getRestaurantBySlug, isSubscriptionActive } from "@/lib/restaurants-server";
import CartClient from "./cart-client";

export default async function CartPage({
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
  if (!isSubscriptionActive(restaurant)) notFound();

  const tableNumber = table ? parseInt(table, 10) : null;
  if (!tableNumber) notFound();

  return (
    <CartClient
      restaurant={{ id: restaurant.id, name: restaurant.name, slug: restaurant.slug }}
      tableNumber={tableNumber}
    />
  );
}
