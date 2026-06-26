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
  const typeValue = body.type && ["restaurant", "hotel", "both"].includes(body.type as string)
    ? (body.type as string)
    : null;

  if (Object.keys(update).length === 0 && !typeValue) {
    return NextResponse.json({ ok: false, error: "Rien à mettre à jour" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (Object.keys(update).length > 0) {
    const { error } = await admin
      .from("restaurants")
      .update(update)
      .eq("id", restaurantId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  if (typeValue) {
    const { error } = await admin
      .from("restaurants")
      .update({ type: typeValue })
      .eq("id", restaurantId);

    if (error) {
      console.warn("[features] type update failed (column may not exist yet):", error.message);
    }
  }

  return NextResponse.json({ ok: true });
}
