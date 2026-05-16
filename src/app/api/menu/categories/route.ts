import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// GET — list categories for a restaurant
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
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, categories: data ?? [] });
}

// POST — create or update a category
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, restaurantId, name, parentId, order } = body;

  if (!restaurantId || !name)
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const payload = {
    restaurant_id: restaurantId,
    name,
    parent_id: parentId ?? null,
    order: order ?? 0,
  };

  if (id) {
    const { error } = await admin.from("categories").update(payload).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("categories").insert(payload);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — delete a category
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Verify ownership
  const { data: cat } = await admin.from("categories").select("restaurant_id").eq("id", id).maybeSingle();
  if (!cat) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== cat.restaurant_id)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
