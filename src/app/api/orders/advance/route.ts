import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const VALID_TRANSITIONS: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { orderId } = (await req.json()) as { orderId?: string };
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Charger la commande
  const { data: order, error: fetchErr } = await admin
    .from("orders")
    .select("id, restaurant_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
  }

  // Vérifier que l'utilisateur est propriétaire de ce restaurant
  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== order.restaurant_id) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const nextStatus = VALID_TRANSITIONS[order.status];
  if (!nextStatus) {
    return NextResponse.json({ ok: false, error: "Transition invalide" }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
