import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToRestaurant } from "@/lib/push";

/**
 * POST /api/orders/escalate
 * Body: { orderId }
 *
 * Si la commande assignée n'a pas été acquittée après 1 min,
 * notifie tous les autres membres du restaurant.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, restaurant_id, table_number, room_label, order_type, total, assigned_to, acknowledged_at, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (order.restaurant_id !== auth.ctx.restaurantId && auth.ctx.role !== "superadmin") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (order.acknowledged_at) {
    return NextResponse.json({ ok: true, alreadyAcknowledged: true });
  }

  if (!order.assigned_to) {
    return NextResponse.json({ ok: true, notAssigned: true });
  }

  const age = Date.now() - new Date(order.created_at as string).getTime();
  if (age < 55_000) {
    return NextResponse.json({ ok: true, tooEarly: true });
  }

  const total = (order.total as number).toLocaleString("fr-FR");
  const location = order.room_label
    ? `Chambre ${order.room_label}`
    : `Table ${order.table_number}`;

  const payload = {
    title: `Commande non prise en charge · ${location}`,
    body: order.order_type === "food"
      ? `${total} FCFA — Le serveur assigné n'a pas répondu`
      : `${location} — Le staff assigné n'a pas répondu`,
    url: "/dashboard/orders",
  };

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("restaurant_id", order.restaurant_id)
    .neq("user_id", order.assigned_to);

  const uniqueUserIds = [...new Set((subs ?? []).map((s) => s.user_id))];

  await Promise.allSettled(
    uniqueUserIds.map((uid) =>
      sendPushToRestaurant(order.restaurant_id, payload, uid)
    )
  );

  return NextResponse.json({ ok: true, escalatedTo: uniqueUserIds.length });
}
