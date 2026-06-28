import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * POST /api/orders/escalate
 * Body: { orderId }
 *
 * Si la commande assignée n'a pas été acquittée après 1 min,
 * notifie tous les autres membres en ligne du restaurant via la queue.
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

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ ok: false }, { status: orderError ? 500 : 404 });
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
    : order.table_number
    ? `Table ${order.table_number}`
    : "Commande";

  const payload = {
    title: `Commande non prise en charge · ${location}`,
    body: order.order_type === "food"
      ? `${total} FCFA — Le serveur assigné n'a pas répondu`
      : `${location} — Le staff assigné n'a pas répondu`,
    url: "/dashboard/orders",
  };

  // Get all online staff except the assigned waiter
  const { data: staff } = await admin
    .from("profiles")
    .select("id")
    .eq("restaurant_id", order.restaurant_id)
    .eq("is_online", true)
    .neq("id", order.assigned_to);

  const targetIds = (staff ?? []).map((s) => s.id as string);

  if (targetIds.length > 0) {
    const jobs = targetIds.map((profileId) => ({
      order_id: orderId,
      profile_id: profileId,
      restaurant_id: order.restaurant_id as string,
      payload,
      status: "pending" as const,
    }));

    await admin.from("notification_queue").insert(jobs);

    // Fire-and-forget worker
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

  return NextResponse.json({ ok: true, escalatedTo: targetIds.length });
}
