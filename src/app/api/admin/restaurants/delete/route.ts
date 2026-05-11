import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireSuperadmin } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as { restaurantId: string };
  if (!body.restaurantId) {
    return NextResponse.json(
      { ok: false, error: "restaurantId requis" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Récupère tous les owners liés à ce restaurant pour les supprimer.
  const { data: owners } = await admin
    .from("profiles")
    .select("id")
    .eq("restaurant_id", body.restaurantId);

  // Supprime le restaurant (cascade sur categories/products/orders, set null sur profiles).
  const { error } = await admin
    .from("restaurants")
    .delete()
    .eq("id", body.restaurantId);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  // Supprime les comptes Auth des owners.
  for (const o of owners ?? []) {
    await admin.auth.admin.deleteUser(o.id).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
