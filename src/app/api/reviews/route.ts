import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "restaurantId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("reviews")
    .select("id, restaurant_id, order_id, customer_name, rating, comment, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
  }

  const { restaurantId, orderId, customerName, rating, comment } = body as {
    restaurantId?: string;
    orderId?: string;
    customerName?: string;
    rating?: number;
    comment?: string;
  };

  if (!restaurantId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "restaurantId et rating (1-5) requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (orderId) {
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: false, error: "Vous avez déjà noté cette commande." }, { status: 409 });
    }
  }

  const { error: insertErr } = await admin.from("reviews").insert({
    restaurant_id: restaurantId,
    order_id: orderId || null,
    customer_name: (customerName || "Client").trim().slice(0, 50),
    rating,
    comment: comment?.trim().slice(0, 500) || null,
  });

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const { data: stats } = await admin
    .from("reviews")
    .select("rating")
    .eq("restaurant_id", restaurantId);

  if (stats && stats.length > 0) {
    const avg = stats.reduce((s, r) => s + r.rating, 0) / stats.length;
    await admin
      .from("restaurants")
      .update({ avg_rating: Math.round(avg * 10) / 10, review_count: stats.length })
      .eq("id", restaurantId);
  }

  return NextResponse.json({ ok: true });
}
