import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, restaurant_id, display_name, assigned_tables, is_online")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: true, role: null, restaurant: null });
  }

  const role = profile.role as string;
  if (role === "superadmin" || !profile.restaurant_id) {
    return NextResponse.json({ ok: true, role, restaurant: null });
  }

  const { data: rest } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", profile.restaurant_id)
    .maybeSingle();

  return NextResponse.json(
    {
      ok: true,
      role,
      restaurant: rest,
      displayName: profile.display_name ?? null,
      assignedTables: profile.assigned_tables ?? [],
      isOnline: profile.is_online ?? true,
    },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
  );
}
