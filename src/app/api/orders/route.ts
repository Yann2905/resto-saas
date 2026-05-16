import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "restaurantId requis" }, { status: 400 });
  }

  // Vérifier ownership
  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  // Active orders (pending, preparing, ready)
  const { data: activeData, error: errActive } = await admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .neq("status", "served")
    .order("created_at", { ascending: false });

  if (errActive) {
    return NextResponse.json({ ok: false, error: errActive.message }, { status: 500 });
  }

  // Served orders from today only
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: servedData, error: errServed } = await admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "served")
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });

  if (errServed) {
    return NextResponse.json({ ok: false, error: errServed.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    orders: [...(activeData ?? []), ...(servedData ?? [])],
  });
}
