import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
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

  // Build list of profiles to notify
  const targetIds: string[] = [];

  // Always notify owners
  const { data: owners } = await admin
    .from("profiles")
    .select("id, is_online")
    .eq("restaurant_id", order.restaurant_id)
    .eq("role", "owner");

  if (owners) {
    for (const o of owners) {
      if (o.is_online) targetIds.push(o.id);
    }
  }

  // Notify assigned waiter if any
  if (order.assigned_to) {
    const { data: waiter } = await admin
      .from("profiles")
      .select("id, is_online")
      .eq("id", order.assigned_to)
      .maybeSingle();
    if (waiter?.is_online && !targetIds.includes(waiter.id)) {
      targetIds.push(waiter.id);
    }
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, queued: 0 });
  }

  // Insert into notification queue
  const jobs = targetIds.map((profileId) => ({
    order_id: orderId,
    profile_id: profileId,
    restaurant_id: order.restaurant_id,
    payload,
    status: "pending" as const,
  }));

  const { error: insertErr } = await admin
    .from("notification_queue")
    .insert(jobs);

  if (insertErr) {
    console.error("[notify] queue insert error:", insertErr.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Fire-and-forget: trigger the worker immediately
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resto-saas.vercel.app";
  const cronSecret = process.env.CRON_SECRET || "";
  fetch(`${appUrl}/api/cron/process-notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cronSecret ? { authorization: `Bearer ${cronSecret}` } : {}),
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, queued: targetIds.length });
}
