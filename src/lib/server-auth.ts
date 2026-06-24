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

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, restaurant_id, display_name, assigned_tables, restaurants(plan, plan_expires_at, feature_overrides, is_partner)")
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

  const resto = profile.restaurants as { plan?: string; plan_expires_at?: string; feature_overrides?: FeatureOverrides; is_partner?: boolean } | null;
  const plan = (resto?.plan as string) ?? "starter";
  const planExpiresAt = (resto?.plan_expires_at as string) ?? null;
  const featureOverrides: FeatureOverrides = (resto?.feature_overrides as FeatureOverrides) ?? {};
  const isPartner = (resto?.is_partner as boolean) ?? false;

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
