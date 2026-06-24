import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * PUT /api/admin/restaurants/features — Mettre à jour les overrides + partenaire
 * Body: { restaurantId, featureOverrides?, isPartner?, plan?, planExpiresAt? }
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
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "restaurantId requis" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.featureOverrides !== undefined) {
    update.feature_overrides = body.featureOverrides;
  }
  if (typeof body.isPartner === "boolean") {
    update.is_partner = body.isPartner;
  }
  if (body.plan && ["starter", "pro", "business"].includes(body.plan as string)) {
    update.plan = body.plan;
  }
  if (body.planExpiresAt !== undefined) {
    update.plan_expires_at = body.planExpiresAt || null;
  }
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Rien à mettre à jour" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update(update)
    .eq("id", restaurantId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
