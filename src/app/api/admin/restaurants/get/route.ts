import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Restaurant introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, restaurant: data });
}
