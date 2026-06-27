import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolvePaymentToken } from "@/lib/payment-tokens";
import {
  getPlan,
  generatePaymentReference,
  computeNewExpiry,
} from "@/lib/payment-plans";
import { createPayment } from "@/lib/genius-pay";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://resto-saas.vercel.app";

/**
 * POST /api/payment/initiate
 *
 * Body: { token, planKey, method, phone? }
 *
 * 1. Valide le token, plan et méthode
 * 2. Crée un payment local en statut 'pending'
 * 3. Appelle Genius Pay pour créer la transaction
 * 4. Retourne le checkout_url pour rediriger le client
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalide" },
      { status: 400 },
    );
  }

  const { token, planKey } = body as {
    token?: string;
    planKey?: string;
  };

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { ok: false, error: "Token manquant" },
      { status: 400 },
    );
  }

  if (!planKey || typeof planKey !== "string") {
    return NextResponse.json(
      { ok: false, error: "Plan manquant" },
      { status: 400 },
    );
  }


  // ── Résoudre le token ─────────────────────────────────────────
  const resolved = await resolvePaymentToken(token);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "Lien de paiement invalide ou expiré" },
      { status: 404 },
    );
  }

  const restaurant = resolved.restaurants;
  if (!restaurant.active) {
    return NextResponse.json(
      { ok: false, error: "Restaurant désactivé" },
      { status: 403 },
    );
  }

  // ── Résoudre le plan ──────────────────────────────────────────
  const isPartnerPlan = planKey.endsWith("_partner");
  const isPartner = (restaurant as Record<string, unknown>).is_partner === true;
  if (isPartnerPlan && !isPartner) {
    return NextResponse.json(
      { ok: false, error: "Ce tarif est réservé aux partenaires" },
      { status: 403 },
    );
  }
  const plan = getPlan(planKey);
  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "Plan inconnu" },
      { status: 400 },
    );
  }

  // ── Anti-doublon : paiement pending existant pour ce token ?
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("payments")
    .select("id, reference, provider_ref")
    .eq("token_id", resolved.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.provider_ref) {
    // Un paiement Genius Pay existe déjà — retourner le checkout_url
    const checkoutUrl = `https://pay.genius.ci/checkout/${existing.provider_ref}`;
    return NextResponse.json({
      ok: true,
      paymentId: existing.id,
      reference: existing.reference,
      amount: plan.price,
      checkoutUrl,
      alreadyPending: true,
    });
  }

  // ── Créer le payment local ────────────────────────────────────
  const reference = generatePaymentReference();
  const newExpiry = computeNewExpiry(
    restaurant.subscription_expires_at,
    plan.months,
  );

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      restaurant_id: restaurant.id,
      token_id: resolved.id,
      plan_key: plan.key,
      amount: plan.price,
      method: "autre",
      status: "pending",
      reference,
      previous_expiry: restaurant.subscription_expires_at,
      new_expiry: newExpiry.toISOString(),
    })
    .select("id, reference")
    .single();

  if (error || !payment) {
    console.error("[Payment] Insert error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du paiement" },
      { status: 500 },
    );
  }

  // ── Appeler Genius Pay ────────────────────────────────────────
  const geniusResult = await createPayment({
    amount: plan.price,
    currency: "XOF",
    description: `Abonnement ${plan.label} — ${restaurant.name}`,
    customer: {
      name: restaurant.name,
      phone: restaurant.phone || undefined,
      country: "CI",
    },
    success_url: `${APP_URL}/payment/${token}?status=success`,
    error_url: `${APP_URL}/payment/${token}?status=error`,
    metadata: {
      payment_id: payment.id,
      restaurant_id: restaurant.id,
      plan_key: plan.key,
      local_reference: payment.reference,
    },
  });

  if (!geniusResult.success || !geniusResult.data) {
    console.error("[Payment] GeniusPay error:", geniusResult.error);
    // Marquer le paiement local comme failed
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);

    return NextResponse.json(
      {
        ok: false,
        error: geniusResult.error || "Erreur lors de la création du paiement",
      },
      { status: 502 },
    );
  }

  // Stocker la référence Genius Pay dans provider_ref
  await admin
    .from("payments")
    .update({ provider_ref: geniusResult.data.reference })
    .eq("id", payment.id);

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    reference: payment.reference,
    amount: plan.price,
    checkoutUrl: geniusResult.data.checkout_url,
    geniusRef: geniusResult.data.reference,
  });
}
