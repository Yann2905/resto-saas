import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolvePaymentToken } from "@/lib/payment-tokens";
import {
  getPlan,
  generatePaymentReference,
  computeNewExpiry,
} from "@/lib/payment-plans";
import type { PaymentMethod } from "@/types";

const VALID_METHODS: PaymentMethod[] = [
  "mobile_money",
  "orange_money",
  "mtn_money",
  "wave",
  "carte_bancaire",
  "autre",
];

/**
 * POST /api/payment/initiate
 *
 * Body: { token, planKey, method }
 *
 * 1. Valide le token
 * 2. Valide le plan et la méthode
 * 3. Crée un payment en statut 'pending'
 * 4. Retourne la référence + infos pour l'agrégateur
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

  const { token, planKey, method } = body as {
    token?: string;
    planKey?: string;
    method?: string;
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

  if (!method || !VALID_METHODS.includes(method as PaymentMethod)) {
    return NextResponse.json(
      { ok: false, error: "Méthode de paiement invalide" },
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
    .select("id, reference")
    .eq("token_id", resolved.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      paymentId: existing.id,
      reference: existing.reference,
      amount: plan.price,
      alreadyPending: true,
    });
  }

  // ── Créer le payment ──────────────────────────────────────────
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
      method: method as PaymentMethod,
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

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    reference: payment.reference,
    amount: plan.price,
    method,
  });
}
