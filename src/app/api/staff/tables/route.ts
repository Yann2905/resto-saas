import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * PUT /api/staff/tables — Assigner des tables à un serveur
 * Body: { waiterId, tables: number[] }
 */
export async function PUT(request: NextRequest) {
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
  const tables = Array.isArray(body.tables) ? body.tables.filter((t): t is number => typeof t === "number" && t > 0) : [];

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

  // Retirer ces tables des autres serveurs du même restaurant
  if (tables.length > 0) {
    const { data: otherWaiters } = await admin
      .from("profiles")
      .select("id, assigned_tables")
      .eq("restaurant_id", profile.restaurant_id)
      .eq("role", "waiter")
      .neq("id", waiterId);

    if (otherWaiters) {
      for (const other of otherWaiters) {
        const currentTables = (other.assigned_tables as number[]) ?? [];
        const cleaned = currentTables.filter((t) => !tables.includes(t));
        if (cleaned.length !== currentTables.length) {
          await admin
            .from("profiles")
            .update({ assigned_tables: cleaned })
            .eq("id", other.id);
        }
      }
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ assigned_tables: tables })
    .eq("id", waiterId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tables });
}
