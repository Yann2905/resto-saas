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

    // Toujours notifier le(s) owner(s)
    const { data: owners } = await admin
      .from("profiles")
      .select("id")
      .eq("restaurant_id", order.restaurant_id)
      .eq("role", "owner");

    const pushTasks = (owners ?? []).map((o) =>
      sendPushToRestaurant(order.restaurant_id, payload, o.id)
    );

    if (order.assigned_to) {
      // Notifier le serveur assigné (sa table)
      pushTasks.push(
        sendPushToRestaurant(
          order.restaurant_id,
          { ...payload, body: `Table ${order.table_number} · ${total} FCFA — Glissez pour voir` },
          order.assigned_to,
        )
      );
    }
    // Si aucun serveur assigné → seul le owner est notifié.
    // Après 2 min sans acknowledge, le dashboard escalade automatiquement.

    await Promise.allSettled(pushTasks);
  } catch (e) {
    console.error("[push] notify error:", e);
  }

  return NextResponse.json({ ok: true });
}
