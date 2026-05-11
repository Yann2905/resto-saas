import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireSuperadmin } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as {
    slug: string;
    name: string;
    address?: string;
    phone?: string;
    ownerEmail: string;
    ownerPassword: string;
    subscriptionExpiresAt: string | null;
  };

  if (!body.slug || !body.name || !body.ownerEmail || !body.ownerPassword) {
    return NextResponse.json(
      { ok: false, error: "Champs requis manquants" },
      { status: 400 }
    );
  }
  if (body.ownerPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Mot de passe trop court (min 6)" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // 1. Vérifier l'unicité du slug
  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", body.slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Ce slug est déjà utilisé" },
      { status: 409 }
    );
  }

  // 2. Créer le restaurant
  const { data: rest, error: restErr } = await admin
    .from("restaurants")
    .insert({
      slug: body.slug,
      name: body.name,
      address: body.address || null,
      phone: body.phone || null,
      active: true,
      subscription_expires_at: body.subscriptionExpiresAt,
    })
    .select("id")
    .single();

  if (restErr || !rest) {
    return NextResponse.json(
      { ok: false, error: restErr?.message || "Création échouée" },
      { status: 500 }
    );
  }

  // 3. Créer l'utilisateur owner (Auth)
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: body.ownerEmail,
    password: body.ownerPassword,
    email_confirm: true,
  });

  if (userErr || !created.user) {
    // Rollback restaurant
    await admin.from("restaurants").delete().eq("id", rest.id);
    return NextResponse.json(
      {
        ok: false,
        error: userErr?.message || "Création de l'utilisateur échouée",
      },
      { status: 500 }
    );
  }

  // 4. Créer le profile lié
  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: rest.id,
    role: "owner",
    email: body.ownerEmail,
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
