import { supabase } from "./supabase";
import {
  CartItem,
  Order,
  OrderRow,
  OrderStatus,
  mapOrder,
} from "@/types";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createOrder(
  restaurantId: string,
  tableNumber: number | null,
  items: CartItem[],
  roomLabel?: string | null,
): Promise<CreateOrderResult> {
  if (items.length === 0) return { ok: false, error: "Panier vide" };

  const payload = items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));

  const { data, error } = await supabase.rpc("create_order", {
    p_restaurant_id: restaurantId,
    p_table_number: tableNumber,
    p_items: payload,
    p_room_label: roomLabel ?? null,
  });

  if (error) {
    const msg = error.message;
    const stockMatch = msg.match(/Stock insuffisant pour (.+?) \(reste (\d+)\)/);
    if (stockMatch) {
      const product = stockMatch[1];
      const remaining = stockMatch[2];
      return { ok: false, error: `Stock insuffisant pour ${product}. Il n'en reste que ${remaining}.` };
    }
    return { ok: false, error: msg };
  }
  return { ok: true, orderId: data as string };
}

export async function createHotelOrder(
  restaurantId: string,
  roomLabel: string,
  orderType: "service" | "issue",
  items: { id: string; label: string }[],
): Promise<CreateOrderResult> {
  if (items.length === 0) return { ok: false, error: "Aucun élément sélectionné" };

  const { data, error } = await supabase.rpc("create_hotel_order", {
    p_restaurant_id: restaurantId,
    p_room_label: roomLabel,
    p_order_type: orderType,
    p_items: items,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, orderId: data as string };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as OrderRow);
}

export async function listOrdersByRestaurant(
  restaurantId: string,
  opts: { since?: Date; statuses?: OrderStatus[] } = {}
): Promise<Order[]> {
  let q = supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (opts.since) q = q.gte("created_at", opts.since.toISOString());
  if (opts.statuses && opts.statuses.length > 0)
    q = q.in("status", opts.statuses);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as OrderRow[]).map(mapOrder);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;
}
