import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  Order,
  OrderRow,
  Restaurant,
  RestaurantRow,
  mapOrder,
  mapRestaurant,
} from "@/types";
import ReceiptClient from "./receipt-client";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!orderRow) notFound();
  const order: Order = mapOrder(orderRow as OrderRow);

  const { data: restRow } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", order.restaurantId)
    .maybeSingle();

  if (!restRow) notFound();
  const restaurant: Restaurant = mapRestaurant(restRow as RestaurantRow);

  return (
    <ReceiptClient
      order={order}
      restaurant={restaurant}
      autoPrint={print === "auto"}
    />
  );
}
