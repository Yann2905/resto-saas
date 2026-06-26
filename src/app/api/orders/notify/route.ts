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
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[notify] order fetch error:", orderError.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  console.log("[notify] order data:", {
    id: orderId,
    room_label: order.room_label,
    table_number: order.table_number,
    order_type: order.order_type,
  });

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

  try {
    const payload = {
      title: `${typeLabel} · ${location}`,
      body: order.order_type === "food" ? `Total : ${total} FCFA` : "",
      url: "/dashboard/orders",
    };

    if (order.assigned_to) {
      const { data: owners } = await admin
        .from("profiles")
        .select("id")
        .eq("restaurant_id", order.restaurant_id)
        .eq("role", "owner");

      const pushTasks = [
        sendPushToRestaurant(
          order.restaurant_id,
          { ...payload, body: order.order_type === "food" ? `${location} · ${total} FCFA — Glissez pour voir` : `${location} — Glissez pour voir` },
          order.assigned_to,
        ),
        ...(owners ?? []).map((o) =>
          sendPushToRestaurant(order.restaurant_id, payload, o.id)
        ),
      ];
      await Promise.allSettled(pushTasks);
    } else {
      await sendPushToRestaurant(order.restaurant_id, payload);
    }
  } catch (e) {
    console.error("[push] notify error:", e);
  }

  return NextResponse.json({ ok: true });
}
