import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * POST /api/orders/acknowledge — Le serveur confirme la prise en charge
 * Body: { orderId }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, restaurant_id, assigned_to, acknowledged_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
  }

  if (auth.ctx.role !== "superadmin" && order.restaurant_id !== auth.ctx.restaurantId) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  if (order.acknowledged_at) {
    return NextResponse.json({ ok: true, alreadyAcknowledged: true });
  }

  const now = new Date().toISOString();

  // Si la commande n'était pas encore assignée (fallback), on l'assigne à celui qui prend
  const updates: Record<string, unknown> = { acknowledged_at: now };
  if (!order.assigned_to) {
    updates.assigned_to = auth.ctx.userId;
  }

  const { error } = await admin
    .from("orders")
    .update(updates)
    .eq("id", orderId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Récupérer le nom du serveur pour le retourner
  const assignedId = (order.assigned_to ?? auth.ctx.userId) as string;
  const { data: waiterProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", assignedId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    acknowledgedAt: now,
    waiterName: waiterProfile?.display_name ?? "Serveur",
  });
}
