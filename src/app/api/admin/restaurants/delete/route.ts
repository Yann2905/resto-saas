import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireSuperadmin } from "@/lib/server-auth";
import { isUUID } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    restaurantId?: unknown;
  } | null;

  if (!body || !isUUID(body.restaurantId)) {
    return NextResponse.json(
      { ok: false, error: "restaurantId invalide" },
      { status: 400 }
    );
  }
  const restaurantId = body.restaurantId as string;

  const admin = createSupabaseAdminClient();

  const { data: owners } = await admin
    .from("profiles")
    .select("id")
    .eq("restaurant_id", restaurantId);

  const { error } = await admin
    .from("restaurants")
    .delete()
    .eq("id", restaurantId);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  for (const o of owners ?? []) {
    await admin.auth.admin.deleteUser(o.id).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
