import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToRestaurant } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`notify:${ip}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "Trop de requêtes" }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, restaurant_id, total, table_number, room_label, order_type, assigned_to")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ ok: false }, { status: orderError ? 500 : 404 });
  }

  const total = (order.total as number).toLocaleString("fr-FR");
  const location = order.room_label
    ? `Chambre ${order.room_label}`
    : order.table_number
    ? `Table ${order.table_number}`
    : "Nouvelle";

  const typeLabel = order.order_type === "service"
    ? "Demande de service"
    : order.order_type === "issue"
    ? "Signalement"
    : "Nouvelle commande";

  const payload = {
    title: `${typeLabel} · ${location}`,
    body: order.order_type === "food"
      ? `${location} · ${total} FCFA`
      : `${location}`,
    url: "/dashboard/orders",
  };

  const sent: string[] = [];

  // Send push directly to all owners (no is_online filter)
  sendPushToRestaurant(order.restaurant_id, payload).catch((err) => {
    console.error("[notify] push to restaurant failed:", err);
  });
  sent.push("restaurant");

  // Also send specifically to assigned waiter if any
  if (order.assigned_to) {
    sendPushToRestaurant(order.restaurant_id, payload, order.assigned_to).catch((err) => {
      console.error("[notify] push to waiter failed:", err);
    });
    sent.push("waiter:" + order.assigned_to);
  }

  return NextResponse.json({ ok: true, sent: sent.length });
}
