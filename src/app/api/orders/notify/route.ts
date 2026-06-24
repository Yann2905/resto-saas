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
    if (order.assigned_to) {
      // Notification au serveur assigné
      await sendPushToRestaurant(
        order.restaurant_id,
        {
          title: `Nouvelle commande · Table ${order.table_number}`,
          body: `Total : ${total} FCFA — Glissez pour voir`,
          url: "/dashboard/orders",
        },
        order.assigned_to,
      );

      // Notification aussi au propriétaire (supervision)
      const { data: owners } = await admin
        .from("profiles")
        .select("id")
        .eq("restaurant_id", order.restaurant_id)
        .eq("role", "owner");

      if (owners) {
        for (const owner of owners) {
          await sendPushToRestaurant(
            order.restaurant_id,
            {
              title: `Nouvelle commande · Table ${order.table_number}`,
              body: `Total : ${total} FCFA`,
              url: "/dashboard/orders",
            },
            owner.id,
          );
        }
      }
    } else {
      // Pas de serveur assigné → notification à tout le restaurant
      await sendPushToRestaurant(order.restaurant_id, {
        title: `Nouvelle commande · Table ${order.table_number}`,
        body: `Total : ${total} FCFA`,
        url: "/dashboard/orders",
      });
    }
  } catch (e) {
    console.error("[push] notify error:", e);
  }

  return NextResponse.json({ ok: true });
}
