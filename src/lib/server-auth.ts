import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";
import { createSupabaseAdminClient } from "./supabase-admin";

export type AuthedContext = {
  userId: string;
  role: "owner" | "superadmin";
  restaurantId: string | null;
};

export async function requireUser(): Promise<
  { ok: true; ctx: AuthedContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 }
      ),
    };
  }

  // Use admin client to bypass RLS for the profile lookup
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Profil introuvable" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      role: profile.role as "owner" | "superadmin",
      restaurantId: profile.restaurant_id as string | null,
    },
  };
}

export async function requireSuperadmin(): Promise<
  { ok: true; ctx: AuthedContext } | { ok: false; response: NextResponse }
> {
  const r = await requireUser();
  if (!r.ok) return r;
  if (r.ctx.role !== "superadmin") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Accès superadmin requis" },
        { status: 403 }
      ),
    };
  }
  return r;
}

export async function requireOwnerOfRestaurant(
  restaurantId: string
): Promise<
  { ok: true; ctx: AuthedContext } | { ok: false; response: NextResponse }
> {
  const r = await requireUser();
  if (!r.ok) return r;
  if (r.ctx.role === "superadmin") return r;
  if (r.ctx.restaurantId !== restaurantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Accès refusé" },
        { status: 403 }
      ),
    };
  }
  return r;
}
