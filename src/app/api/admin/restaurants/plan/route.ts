import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * PUT /api/admin/restaurants/plan — Changer le plan d'un restaurant
 * Body: { restaurantId, plan, planExpiresAt? }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const restaurantId = body.restaurantId as string;
  const plan = body.plan as string;
  const planExpiresAt = (body.planExpiresAt as string) || null;

  if (!restaurantId || !["starter", "pro", "business"].includes(plan)) {
    return NextResponse.json(
      { ok: false, error: "restaurantId et plan (starter/pro/business) requis" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("restaurants")
    .update({ plan, plan_expires_at: planExpiresAt })
    .eq("id", restaurantId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan, planExpiresAt });
}
