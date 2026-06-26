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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeRes, servedRes] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .neq("status", "served")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("status", "served")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (activeRes.error) {
    return NextResponse.json({ ok: false, error: activeRes.error.message }, { status: 500 });
  }
  if (servedRes.error) {
    return NextResponse.json({ ok: false, error: servedRes.error.message }, { status: 500 });
  }

  const allOrders = [...(activeRes.data ?? []), ...(servedRes.data ?? [])];

  // Enrich items missing imageUrl by looking up the product table
  const productIdsNeeded = new Set<string>();
  for (const order of allOrders) {
    const items = order.items as { productId?: string; imageUrl?: string }[];
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (!it.imageUrl && it.productId) productIdsNeeded.add(it.productId);
    }
  }

  if (productIdsNeeded.size > 0) {
    const { data: products } = await admin
      .from("products")
      .select("id, image_url")
      .in("id", [...productIdsNeeded]);

    if (products && products.length > 0) {
      const imgMap = new Map(products.map((p) => [p.id, p.image_url as string | null]));
      for (const order of allOrders) {
        const items = order.items as { productId?: string; imageUrl?: string }[];
        if (!Array.isArray(items)) continue;
        for (const it of items) {
          if (!it.imageUrl && it.productId) {
            const url = imgMap.get(it.productId);
            if (url) it.imageUrl = url;
          }
        }
      }
    }
  }

  return NextResponse.json(
    { ok: true, orders: allOrders },
    { headers: { "Cache-Control": "private, no-cache, max-age=0" } },
  );
}
