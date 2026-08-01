import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  let pw = "";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (const b of array) pw += chars[b % chars.length];
  return pw;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
  }

  const { restaurantName, ownerName, email, phone, city, type } = body as {
    restaurantName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    city?: string;
    type?: string;
  };

  if (!restaurantName?.trim() || !ownerName?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ ok: false, error: "Tous les champs sont requis." }, { status: 400 });
  }

  const emailClean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return NextResponse.json({ ok: false, error: "Email invalide." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  let slug = slugify(restaurantName.trim());
  if (!slug) slug = `resto-${Date.now()}`;

  const { data: existing } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const validTypes = ["restaurant", "hotel"];
  const restType = typeof type === "string" && validTypes.includes(type) ? type : "restaurant";

  const { data: rest, error: restErr } = await admin
    .from("restaurants")
    .insert({
      slug,
      name: restaurantName.trim(),
      address: city?.trim() || "Abidjan",
      phone: phone.trim(),
      active: true,
      plan: "starter",
      subscription_expires_at: trialExpiry.toISOString(),
      type: restType,
      delivery_enabled: false,
    })
    .select("id")
    .single();

  if (restErr || !rest) {
    return NextResponse.json({ ok: false, error: restErr?.message || "Erreur de création" }, { status: 500 });
  }

  const password = generatePassword();

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: emailClean,
    password,
    email_confirm: true,
    user_metadata: { full_name: ownerName.trim() },
  });

  if (userErr || !created.user) {
    await admin.from("restaurants").delete().eq("id", rest.id);
    return NextResponse.json({ ok: false, error: userErr?.message || "Erreur de création du compte" }, { status: 500 });
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: rest.id,
    role: "owner",
    email: emailClean,
    display_name: ownerName.trim(),
  });

  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("restaurants").delete().eq("id", rest.id);
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: emailClean,
    password,
    slug,
  });
}
