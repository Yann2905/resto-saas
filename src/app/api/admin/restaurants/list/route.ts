import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, restaurants: data ?? [] });
}
