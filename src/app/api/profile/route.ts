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
    .select("role, restaurant_id")
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

  return NextResponse.json({ ok: true, role, restaurant: rest });
}
