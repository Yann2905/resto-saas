import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// GET — list products for a restaurant
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const restaurantId =
    req.nextUrl.searchParams.get("restaurantId") ?? auth.ctx.restaurantId;
  if (!restaurantId)
    return NextResponse.json({ ok: false, error: "Missing restaurantId" }, { status: 400 });

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, products: data ?? [] });
}

// POST — create or update a product
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, restaurantId, ...fields } = body;

  if (!restaurantId)
    return NextResponse.json({ ok: false, error: "Missing restaurantId" }, { status: 400 });

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const payload = { restaurant_id: restaurantId, ...fields };

  if (id) {
    const { error } = await admin.from("products").update(payload).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("products").insert(payload);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — delete a product
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: prod } = await admin.from("products").select("restaurant_id").eq("id", id).maybeSingle();
  if (!prod) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== prod.restaurant_id)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
