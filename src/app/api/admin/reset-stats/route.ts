import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Superadmin only
  if (auth.ctx.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "Accès réservé au superadmin" }, { status: 403 });
  }

  const { restaurantId } = (await req.json()) as { restaurantId?: string };
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "restaurantId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Verify restaurant exists
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "Restaurant introuvable" }, { status: 404 });
  }

  // Call RPC to delete orders, cash sessions, expenses
  const { error } = await admin.rpc("reset_restaurant_stats", {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("[reset-stats] RPC error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Stats de ${restaurant.name} remises à zéro` });
}
