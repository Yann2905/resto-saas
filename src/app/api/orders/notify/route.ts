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

  // If assigned to a waiter, check if they're online
  if (order.assigned_to) {
    const { data: waiterProfile } = await admin
      .from("profiles")
      .select("id, is_online")
      .eq("id", order.assigned_to)
      .maybeSingle();

    if (waiterProfile?.is_online) {
      sendPushToRestaurant(order.restaurant_id, payload, order.assigned_to).catch((err) => {
        console.error("[notify] push to waiter failed:", err);
      });
      sent.push("waiter:" + order.assigned_to);
    } else {
      // Waiter is offline — find another online waiter for this table
      const tableNum = order.table_number as number | null;
      let newWaiterId: string | null = null;

      if (tableNum) {
        const { data: onlineWaiter } = await admin
          .from("profiles")
          .select("id")
          .eq("restaurant_id", order.restaurant_id)
          .eq("role", "waiter")
          .eq("is_online", true)
          .neq("id", order.assigned_to)
          .limit(1)
          .maybeSingle();

        if (onlineWaiter) {
          newWaiterId = onlineWaiter.id as string;
          await admin
            .from("orders")
            .update({ assigned_to: newWaiterId })
            .eq("id", orderId);

          sendPushToRestaurant(order.restaurant_id, payload, newWaiterId).catch((err) => {
            console.error("[notify] push to reassigned waiter failed:", err);
          });
          sent.push("reassigned:" + newWaiterId);
        }
      }
    }
  }

  // Send push to owners/managers (online only)
  sendPushToRestaurant(order.restaurant_id, payload, null, true).catch((err) => {
    console.error("[notify] push to restaurant failed:", err);
  });
  sent.push("restaurant-online");

  return NextResponse.json({ ok: true, sent: sent.length });
}
