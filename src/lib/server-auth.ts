import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";
import { createSupabaseAdminClient } from "./supabase-admin";
import { isPlanExpired, type FeatureOverrides } from "./plan-limits";

export type AuthedContext = {
  userId: string;
  role: "owner" | "superadmin" | "waiter";
  restaurantId: string | null;
  displayName: string | null;
  assignedTables: number[];
  plan: string;
  planExpired: boolean;
  featureOverrides: FeatureOverrides;
  isPartner: boolean;
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
    .select("role, restaurant_id, display_name, assigned_tables")
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

  let plan = "starter";
  let planExpiresAt: string | null = null;
  let featureOverrides: FeatureOverrides = {};
  let isPartner = false;

  if (profile.restaurant_id) {
    const { data: resto } = await admin
      .from("restaurants")
      .select("plan, plan_expires_at, feature_overrides, is_partner")
      .eq("id", profile.restaurant_id)
      .maybeSingle();
    if (resto) {
      plan = (resto.plan as string) ?? "starter";
      planExpiresAt = (resto.plan_expires_at as string) ?? null;
      featureOverrides = (resto.feature_overrides as FeatureOverrides) ?? {};
      isPartner = (resto.is_partner as boolean) ?? false;
    }
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      role: profile.role as "owner" | "superadmin" | "waiter",
      restaurantId: profile.restaurant_id as string | null,
      displayName: (profile.display_name as string) ?? null,
      assignedTables: (profile.assigned_tables as number[]) ?? [],
      plan,
      planExpired: isPlanExpired(planExpiresAt),
      featureOverrides,
      isPartner,
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
