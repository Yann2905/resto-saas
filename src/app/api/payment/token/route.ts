import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createPaymentToken } from "@/lib/payment-tokens";

/**
 * POST /api/payment/token
 *
 * Crée un token de paiement pour le restaurant de l'utilisateur connecté.
 * Permet au client d'accéder à la page de paiement depuis ses paramètres.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Non authentifié" },
      { status: 401 },
    );
  }

  // Trouver le restaurant de l'utilisateur via la table profiles
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.restaurant_id) {
    return NextResponse.json(
      { ok: false, error: "Aucun restaurant associé" },
      { status: 404 },
    );
  }

  try {
    const tokenRow = await createPaymentToken(profile.restaurant_id);
    return NextResponse.json({ ok: true, token: tokenRow.token });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 },
    );
  }
}
