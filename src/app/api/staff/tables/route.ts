import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * PUT /api/staff/tables — Assigner des tables (ou chambres) à un serveur
 * Body: { waiterId, tables: number[] } ou { waiterId, rooms: string[] }
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
  const rooms = Array.isArray(body.rooms) ? body.rooms.filter((r): r is string => typeof r === "string" && r.trim().length > 0) : [];

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

  const isRoomMode = rooms.length > 0 || (tables.length === 0 && Array.isArray(body.rooms));

  if (isRoomMode) {
    if (rooms.length > 0) {
      const { data: otherWaiters } = await admin
        .from("profiles")
        .select("id, assigned_rooms")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("role", "waiter")
        .neq("id", waiterId);

      if (otherWaiters) {
        for (const other of otherWaiters) {
          const currentRooms = (other.assigned_rooms as string[]) ?? [];
          const cleaned = currentRooms.filter((r) => !rooms.includes(r));
          if (cleaned.length !== currentRooms.length) {
            await admin
              .from("profiles")
              .update({ assigned_rooms: cleaned })
              .eq("id", other.id);
          }
        }
      }
    }

    const { error } = await admin
      .from("profiles")
      .update({ assigned_rooms: rooms })
      .eq("id", waiterId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rooms });
  }

  // Table mode (restaurants)
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
