import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// GET — list products for a restaurant (includes category links)
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
    .select("*, product_category_links(id, product_id, category_id, quantity_per_unit)")
    .eq("restaurant_id", restaurantId)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, products: data ?? [] });
}

// POST — create or update a product (with optional category links)
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, restaurantId, category_links, ...fields } = body;

  if (!restaurantId)
    return NextResponse.json({ ok: false, error: "Missing restaurantId" }, { status: 400 });

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const payload = { restaurant_id: restaurantId, ...fields };

  let productId = id;

  if (id) {
    const { error } = await admin.from("products").update(payload).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { data: inserted, error } = await admin.from("products").insert(payload).select("id").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    productId = inserted.id;
  }

  // Save category links if provided
  if (category_links !== undefined && productId) {
    const links = category_links as { category_id: string; quantity_per_unit: number }[];

    // Delete existing links
    await admin.from("product_category_links").delete().eq("product_id", productId);

    // Insert new links
    if (links.length > 0) {
      const rows = links.map((l) => ({
        product_id: productId,
        category_id: l.category_id,
        quantity_per_unit: l.quantity_per_unit,
      }));
      const { error: linkErr } = await admin.from("product_category_links").insert(rows);
      if (linkErr) {
        console.error("[products] category links insert error:", linkErr);
      }
    }
  }

  revalidateTag(`products-${restaurantId}`, "max");
  return NextResponse.json({ ok: true, productId });
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

  // Links are deleted via CASCADE
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  revalidateTag(`products-${prod.restaurant_id}`, "max");
  return NextResponse.json({ ok: true });
}
