import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToRestaurant } from "@/lib/push";

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { online?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  if (typeof body.online !== "boolean") {
    return NextResponse.json({ ok: false, error: "online requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_online: body.online })
    .eq("id", auth.ctx.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  try {
    if (!body.online && auth.ctx.restaurantId) {
      const { data: pendingOrders } = await admin
        .from("orders")
        .select("id, restaurant_id, table_number, room_label, total, order_type")
        .eq("restaurant_id", auth.ctx.restaurantId)
        .eq("assigned_to", auth.ctx.userId)
        .eq("status", "pending")
        .is("acknowledged_at", null);

      if (pendingOrders && pendingOrders.length > 0) {
        const { data: onlineWaiter } = await admin
          .from("profiles")
          .select("id")
          .eq("restaurant_id", auth.ctx.restaurantId)
          .eq("role", "waiter")
          .eq("is_online", true)
          .neq("id", auth.ctx.userId)
          .limit(1)
          .maybeSingle();

        if (onlineWaiter) {
          const newWaiterId = onlineWaiter.id as string;
          const orderIds = pendingOrders.map((o) => o.id);

          await admin
            .from("orders")
            .update({ assigned_to: newWaiterId })
            .in("id", orderIds);

          for (const o of pendingOrders) {
            const location = o.room_label
              ? `Chambre ${o.room_label}`
              : o.table_number
              ? `Table ${o.table_number}`
              : "Commande";
            const typeLabel = o.order_type === "service"
              ? "Demande de service"
              : o.order_type === "issue"
              ? "Signalement"
              : "Commande transférée";

            sendPushToRestaurant(auth.ctx.restaurantId, {
              title: `${typeLabel} · ${location}`,
              body: o.order_type === "food"
                ? `${location} · ${(o.total as number).toLocaleString("fr-FR")} FCFA`
                : location,
              url: "/dashboard/orders",
            }, newWaiterId).catch(() => {});
          }
        }
      }
    }

    if (body.online && auth.ctx.restaurantId) {
      const { data: pendingOrders } = await admin
        .from("orders")
        .select("id, restaurant_id, table_number, room_label, total, order_type, assigned_to")
        .eq("restaurant_id", auth.ctx.restaurantId)
        .eq("status", "pending");

      if (pendingOrders && pendingOrders.length > 0) {
        for (const o of pendingOrders) {
          if (o.assigned_to !== auth.ctx.userId) continue;
          const location = o.room_label
            ? `Chambre ${o.room_label}`
            : o.table_number
            ? `Table ${o.table_number}`
            : "Commande";
          const typeLabel = o.order_type === "service"
            ? "Demande de service"
            : o.order_type === "issue"
            ? "Signalement"
            : "Commande en attente";

          sendPushToRestaurant(auth.ctx.restaurantId, {
            title: `${typeLabel} · ${location}`,
            body: o.order_type === "food"
              ? `${location} · ${(o.total as number).toLocaleString("fr-FR")} FCFA`
              : location,
            url: "/dashboard/orders",
          }, auth.ctx.userId).catch(() => {});
        }
      }
    }
  } catch {
    // is_online or assigned_tables columns may not exist yet
  }

  return NextResponse.json({ ok: true });
}
