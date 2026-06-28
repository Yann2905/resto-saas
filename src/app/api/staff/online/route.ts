import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * PUT /api/staff/online — Toggle is_online for the current user
 * Body: { online: boolean }
 *
 * When going online, check for pending orders on assigned tables/rooms
 * and queue notifications for them.
 */
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

  // Update is_online
  const { error } = await admin
    .from("profiles")
    .update({ is_online: body.online })
    .eq("id", auth.ctx.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // If going online, check for pending orders on assigned tables/rooms
  if (body.online && auth.ctx.restaurantId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("assigned_tables, assigned_rooms")
      .eq("id", auth.ctx.userId)
      .maybeSingle();

    if (profile) {
      const tables = (profile.assigned_tables as number[]) ?? [];
      const rooms = (profile.assigned_rooms as string[]) ?? [];

      // Find pending orders assigned to this waiter OR on their tables/rooms
      let query = admin
        .from("orders")
        .select("id, restaurant_id, table_number, room_label, total, order_type, assigned_to")
        .eq("restaurant_id", auth.ctx.restaurantId)
        .eq("status", "pending");

      const { data: pendingOrders } = await query;

      if (pendingOrders && pendingOrders.length > 0) {
        const myOrders = pendingOrders.filter((o) => {
          if (o.assigned_to === auth.ctx.userId) return true;
          if (o.table_number && tables.includes(o.table_number)) return true;
          if (o.room_label && rooms.includes(o.room_label)) return true;
          return false;
        });

        if (myOrders.length > 0) {
          // Check which orders already have a pending/sent notification for this user
          const orderIds = myOrders.map((o) => o.id);
          const { data: existingNotifs } = await admin
            .from("notification_queue")
            .select("order_id")
            .in("order_id", orderIds)
            .eq("profile_id", auth.ctx.userId)
            .in("status", ["pending", "sent"]);

          const alreadyNotified = new Set(
            (existingNotifs ?? []).map((n) => n.order_id as string)
          );

          const newJobs = myOrders
            .filter((o) => !alreadyNotified.has(o.id))
            .map((o) => {
              const location = o.room_label
                ? `Chambre ${o.room_label}`
                : o.table_number
                ? `Table ${o.table_number}`
                : "Nouvelle";
              const typeLabel = o.order_type === "service"
                ? "Demande de service"
                : o.order_type === "issue"
                ? "Signalement"
                : "Nouvelle commande";
              return {
                order_id: o.id,
                profile_id: auth.ctx.userId,
                restaurant_id: auth.ctx.restaurantId!,
                payload: {
                  title: `${typeLabel} · ${location}`,
                  body: o.order_type === "food"
                    ? `${location} · ${(o.total as number).toLocaleString("fr-FR")} FCFA`
                    : location,
                  url: "/dashboard/orders",
                },
                status: "pending" as const,
              };
            });

          if (newJobs.length > 0) {
            await admin.from("notification_queue").insert(newJobs);

            // Fire-and-forget: trigger worker
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resto-saas.vercel.app";
            const cronSecret = process.env.CRON_SECRET || "";
            fetch(`${appUrl}/api/cron/process-notifications`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(cronSecret ? { authorization: `Bearer ${cronSecret}` } : {}),
              },
            }).catch(() => {});
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
