import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const restaurantId =
    req.nextUrl.searchParams.get("restaurantId") || auth.ctx.restaurantId;

  if (!restaurantId) {
    return NextResponse.json(
      { ok: false, error: "Restaurant introuvable" },
      { status: 400 },
    );
  }

  const isOwner =
    auth.ctx.role === "owner" && auth.ctx.restaurantId === restaurantId;
  const isSuperadmin = auth.ctx.role === "superadmin";
  if (!isOwner && !isSuperadmin) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé" },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("pin")
    .eq("id", restaurantId)
    .maybeSingle();

  return NextResponse.json({ ok: true, pin: data?.pin || null });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Corps JSON invalide" },
      { status: 400 },
    );
  }

  const { restaurantId, pin } = body as {
    restaurantId?: string;
    pin?: string | null;
  };

  const targetId = restaurantId || auth.ctx.restaurantId;
  if (!targetId) {
    return NextResponse.json(
      { ok: false, error: "Restaurant introuvable" },
      { status: 400 },
    );
  }

  const isOwner =
    auth.ctx.role === "owner" && auth.ctx.restaurantId === targetId;
  const isSuperadmin = auth.ctx.role === "superadmin";
  if (!isOwner && !isSuperadmin) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé" },
      { status: 403 },
    );
  }

  if (pin !== null && (typeof pin !== "string" || !/^\d{4}$/.test(pin))) {
    return NextResponse.json(
      { ok: false, error: "Le PIN doit être composé de 4 chiffres" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({ pin: pin || null })
    .eq("id", targetId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
