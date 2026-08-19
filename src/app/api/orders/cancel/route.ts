import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { orderId } = (await req.json()) as { orderId?: string };
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Verify ownership
  const { data: order } = await admin
    .from("orders")
    .select("id, restaurant_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
  }

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== order.restaurant_id) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ ok: false, error: "Commande déjà annulée" }, { status: 400 });
  }

  // Call the cancel_order RPC which reverses stock and sets status
  const { error } = await admin.rpc("cancel_order", { p_order_id: orderId });

  if (error) {
    console.error("[cancel_order] RPC error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
