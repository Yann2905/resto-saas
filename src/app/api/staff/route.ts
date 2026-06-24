import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPlanLimits } from "@/lib/plan-limits";

/**
 * GET /api/staff — Liste les serveurs du restaurant
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.ctx.role === "waiter") {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const restaurantId = auth.ctx.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "Aucun restaurant" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, display_name, assigned_tables, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("role", "waiter")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const staff = (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name ?? p.email,
    assignedTables: p.assigned_tables ?? [],
    createdAt: p.created_at,
  }));

  return NextResponse.json({ ok: true, staff });
}

/**
 * POST /api/staff — Créer un compte serveur
 * Body: { displayName, email, password }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.ctx.role === "waiter") {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const limits = getPlanLimits(auth.ctx.plan, auth.ctx.featureOverrides, auth.ctx.isPartner);
  if (!limits.waiters) {
    return NextResponse.json(
      { ok: false, error: "La gestion des serveurs nécessite le plan Pro ou Business" },
      { status: 403 },
    );
  }

  const restaurantId = auth.ctx.restaurantId;
  if (!restaurantId && auth.ctx.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "Aucun restaurant" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const targetRestaurantId = (typeof body.restaurantId === "string" ? body.restaurantId : restaurantId) as string;

  if (!displayName || displayName.length < 2) {
    return NextResponse.json({ ok: false, error: "Nom requis (min 2 caractères)" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ ok: false, error: "Mot de passe requis (min 6 caractères)" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    const msg = createErr.message.includes("already been registered")
      ? "Cet email est déjà utilisé"
      : createErr.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: newUser.user.id,
    restaurant_id: targetRestaurantId,
    role: "waiter",
    email,
    display_name: displayName,
    assigned_tables: [],
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    waiter: {
      id: newUser.user.id,
      email,
      displayName,
      assignedTables: [],
      createdAt: newUser.user.created_at,
    },
  });
}

/**
 * DELETE /api/staff — Supprimer un compte serveur
 * Body: { waiterId }
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (auth.ctx.role === "waiter") {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const waiterId = typeof body.waiterId === "string" ? body.waiterId : "";
  if (!waiterId) {
    return NextResponse.json({ ok: false, error: "waiterId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, restaurant_id")
    .eq("id", waiterId)
    .maybeSingle();

  if (!profile || profile.role !== "waiter") {
    return NextResponse.json({ ok: false, error: "Serveur introuvable" }, { status: 404 });
  }

  if (auth.ctx.role !== "superadmin" && profile.restaurant_id !== auth.ctx.restaurantId) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  await Promise.all([
    admin.from("orders").update({ assigned_to: null }).eq("assigned_to", waiterId),
    admin.from("profiles").delete().eq("id", waiterId),
    admin.auth.admin.deleteUser(waiterId),
  ]);

  return NextResponse.json({ ok: true });
}
