import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToRestaurant } from "@/lib/push";

/**
 * POST /api/orders/notify — Envoie une push notification pour une nouvelle commande
 * Body: { orderId }
 * Appelé fire-and-forget après la création de la commande.
 * Pas d'auth requise (appelé côté client public).
 */
export async function POST(request: NextRequest) {
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

  const { data: order } = await admin
    .from("orders")
    .select("restaurant_id, table_number, total, assigned_to")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const total = (order.total as number).toLocaleString("fr-FR");

  try {
    const payload = {
      title: `Nouvelle commande · Table ${order.table_number}`,
      body: `Total : ${total} FCFA`,
      url: "/dashboard/orders",
    };

    if (order.assigned_to) {
      const { data: owners } = await admin
        .from("profiles")
        .select("id")
        .eq("restaurant_id", order.restaurant_id)
        .eq("role", "owner");

      const pushTasks = [
        sendPushToRestaurant(order.restaurant_id, { ...payload, body: `Total : ${total} FCFA — Glissez pour voir` }, order.assigned_to),
        ...(owners ?? []).map((o) => sendPushToRestaurant(order.restaurant_id, payload, o.id)),
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
