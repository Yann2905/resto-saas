import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireSuperadmin } from "@/lib/server-auth";
import {
  isEmail,
  isIsoDateOrNull,
  isNonEmptyString,
  isSlug,
  isStrongEnoughPassword,
} from "@/lib/validate";

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    slug?: unknown;
    name?: unknown;
    address?: unknown;
    phone?: unknown;
    ownerEmail?: unknown;
    ownerPassword?: unknown;
    subscriptionExpiresAt?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Corps JSON invalide" },
      { status: 400 }
    );
  }

  if (!isSlug(body.slug)) {
    return NextResponse.json(
      { ok: false, error: "Slug invalide (lettres/chiffres/tirets, min 1)" },
      { status: 400 }
    );
  }
  if (!isNonEmptyString(body.name, 120)) {
    return NextResponse.json(
      { ok: false, error: "Nom de restaurant invalide" },
      { status: 400 }
    );
  }
  if (!isEmail(body.ownerEmail)) {
    return NextResponse.json(
      { ok: false, error: "Email invalide" },
      { status: 400 }
    );
  }
  if (!isStrongEnoughPassword(body.ownerPassword)) {
    return NextResponse.json(
      { ok: false, error: "Mot de passe trop court (min 6)" },
      { status: 400 }
    );
  }
  if (!isIsoDateOrNull(body.subscriptionExpiresAt)) {
    return NextResponse.json(
      { ok: false, error: "Date d'expiration invalide" },
      { status: 400 }
    );
  }
  if (body.address !== undefined && typeof body.address !== "string") {
    return NextResponse.json(
      { ok: false, error: "Adresse invalide" },
      { status: 400 }
    );
  }
  if (body.phone !== undefined && typeof body.phone !== "string") {
    return NextResponse.json(
      { ok: false, error: "Téléphone invalide" },
      { status: 400 }
    );
  }

  const slug = body.slug as string;
  const name = (body.name as string).trim();
  const ownerEmail = (body.ownerEmail as string).trim().toLowerCase();
  const ownerPassword = body.ownerPassword as string;
  const address = typeof body.address === "string" ? body.address.trim() : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const subscriptionExpiresAt =
    (body.subscriptionExpiresAt as string | null | undefined) ?? null;

  const admin = createSupabaseAdminClient();

  // Unicité du slug
  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Ce slug est déjà utilisé" },
      { status: 409 }
    );
  }

  const { data: rest, error: restErr } = await admin
    .from("restaurants")
    .insert({
      slug,
      name,
      address: address || null,
      phone: phone || null,
      active: true,
      subscription_expires_at: subscriptionExpiresAt,
    })
    .select("id")
    .single();

  if (restErr || !rest) {
    return NextResponse.json(
      { ok: false, error: restErr?.message || "Création échouée" },
      { status: 500 }
    );
  }

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  });

  if (userErr || !created.user) {
    await admin.from("restaurants").delete().eq("id", rest.id);
    return NextResponse.json(
      {
        ok: false,
        error: userErr?.message || "Création de l'utilisateur échouée",
      },
      { status: 500 }
    );
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: rest.id,
    role: "owner",
    email: ownerEmail,
  });

  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("restaurants").delete().eq("id", rest.id);
    return NextResponse.json(
      { ok: false, error: profErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    restaurantId: rest.id,
    ownerUid: created.user.id,
  });
}
