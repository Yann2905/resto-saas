import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/server-auth";
import type { OpeningHours } from "@/types";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as {
    restaurantId: string;
    name?: string;
    address?: string;
    phone?: string;
    active?: boolean;
    subscriptionExpiresAt?: string | null;
    openingHours?: OpeningHours | null;
    logoUrl?: string | null;
  };

  if (!body.restaurantId) {
    return NextResponse.json(
      { ok: false, error: "restaurantId requis" },
      { status: 400 }
    );
  }

  // Permission : owner sur ce resto, ou superadmin
  const isSuperadmin = auth.ctx.role === "superadmin";
  const isOwner =
    auth.ctx.role === "owner" && auth.ctx.restaurantId === body.restaurantId;
  if (!isSuperadmin && !isOwner) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé" },
      { status: 403 }
    );
  }

  // Owner ne peut PAS modifier active / subscriptionExpiresAt — c'est superadmin.
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.address !== undefined) update.address = body.address;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.logoUrl !== undefined) update.logo_url = body.logoUrl;
  if (body.openingHours !== undefined) update.opening_hours = body.openingHours;
  if (isSuperadmin) {
    if (body.active !== undefined) update.active = body.active;
    if (body.subscriptionExpiresAt !== undefined)
      update.subscription_expires_at = body.subscriptionExpiresAt;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update(update)
    .eq("id", body.restaurantId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
