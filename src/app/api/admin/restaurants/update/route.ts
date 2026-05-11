import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/server-auth";
import type { OpeningHours } from "@/types";
import {
  isHttpsUrlOrNull,
  isIsoDateOrNull,
  isNonEmptyString,
  isOpeningHoursOrNull,
  isUUID,
} from "@/lib/validate";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    restaurantId?: unknown;
    name?: unknown;
    address?: unknown;
    phone?: unknown;
    active?: unknown;
    subscriptionExpiresAt?: unknown;
    openingHours?: unknown;
    logoUrl?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Corps JSON invalide" },
      { status: 400 }
    );
  }
  if (!isUUID(body.restaurantId)) {
    return NextResponse.json(
      { ok: false, error: "restaurantId invalide" },
      { status: 400 }
    );
  }

  const isSuperadmin = auth.ctx.role === "superadmin";
  const isOwner =
    auth.ctx.role === "owner" && auth.ctx.restaurantId === body.restaurantId;
  if (!isSuperadmin && !isOwner) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé" },
      { status: 403 }
    );
  }

  // Validation par champ (uniquement ceux fournis)
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name, 120)) {
      return NextResponse.json(
        { ok: false, error: "Nom invalide" },
        { status: 400 }
      );
    }
    update.name = (body.name as string).trim();
  }
  if (body.address !== undefined) {
    if (body.address !== null && typeof body.address !== "string") {
      return NextResponse.json(
        { ok: false, error: "Adresse invalide" },
        { status: 400 }
      );
    }
    update.address =
      typeof body.address === "string" ? body.address.trim() || null : null;
  }
  if (body.phone !== undefined) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return NextResponse.json(
        { ok: false, error: "Téléphone invalide" },
        { status: 400 }
      );
    }
    update.phone =
      typeof body.phone === "string" ? body.phone.trim() || null : null;
  }
  if (body.logoUrl !== undefined) {
    if (!isHttpsUrlOrNull(body.logoUrl)) {
      return NextResponse.json(
        { ok: false, error: "URL de logo invalide" },
        { status: 400 }
      );
    }
    update.logo_url = body.logoUrl as string | null;
  }
  if (body.openingHours !== undefined) {
    if (!isOpeningHoursOrNull(body.openingHours)) {
      return NextResponse.json(
        { ok: false, error: "Horaires d'ouverture invalides" },
        { status: 400 }
      );
    }
    update.opening_hours = body.openingHours as OpeningHours | null;
  }

  // Champs réservés au superadmin
  if (isSuperadmin) {
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json(
          { ok: false, error: "Champ 'active' invalide" },
          { status: 400 }
        );
      }
      update.active = body.active;
    }
    if (body.subscriptionExpiresAt !== undefined) {
      if (!isIsoDateOrNull(body.subscriptionExpiresAt)) {
        return NextResponse.json(
          { ok: false, error: "Date d'abonnement invalide" },
          { status: 400 }
        );
      }
      update.subscription_expires_at = body.subscriptionExpiresAt as
        | string
        | null;
    }
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
