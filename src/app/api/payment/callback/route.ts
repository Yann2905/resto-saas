import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { markTokenUsed } from "@/lib/payment-tokens";
import { getPlan } from "@/lib/payment-plans";
import { sendSms, smsPaymentConfirmation } from "@/lib/sms";
import { formatFCFA } from "@/lib/format";

/**
 * POST /api/payment/callback
 *
 * Webhook appelé par l'agrégateur de paiement après confirmation.
 * Protégé par PAYMENT_WEBHOOK_SECRET.
 *
 * Body attendu : { reference, providerRef, status: "success" | "failed" }
 */

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  // ── Auth webhook ────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!WEBHOOK_SECRET || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalide" },
      { status: 400 },
    );
  }

  const { reference, providerRef, status } = body as {
    reference?: string;
    providerRef?: string;
    status?: string;
  };

  if (!reference || typeof reference !== "string") {
    return NextResponse.json(
      { ok: false, error: "Référence manquante" },
      { status: 400 },
    );
  }

  if (status !== "success" && status !== "failed") {
    return NextResponse.json(
      { ok: false, error: "Statut invalide (success|failed)" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // ── Trouver le paiement ────────────────────────────────────
  const { data: payment, error: findErr } = await admin
    .from("payments")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (findErr || !payment) {
    return NextResponse.json(
      { ok: false, error: "Paiement introuvable" },
      { status: 404 },
    );
  }

  // Anti-doublon : déjà traité ?
  if (payment.status !== "pending") {
    return NextResponse.json({
      ok: true,
      message: "Paiement déjà traité",
      status: payment.status,
    });
  }

  const now = new Date();

  if (status === "failed") {
    await admin
      .from("payments")
      .update({
        status: "failed",
        provider_ref: providerRef || null,
      })
      .eq("id", payment.id);

    return NextResponse.json({ ok: true, status: "failed" });
  }

  // ── Succès : mettre à jour tout ────────────────────────────
  // 1. Paiement → success
  await admin
    .from("payments")
    .update({
      status: "success",
      provider_ref: providerRef || null,
      paid_at: now.toISOString(),
    })
    .eq("id", payment.id);

  // 2. Restaurant → nouvelle date expiration
  if (payment.new_expiry) {
    await admin
      .from("restaurants")
      .update({ subscription_expires_at: payment.new_expiry })
      .eq("id", payment.restaurant_id);
  }

  // 3. Token → marqué comme utilisé
  if (payment.token_id) {
    await markTokenUsed(payment.token_id);
  }

  // 4. SMS de confirmation
  const restaurant = await admin
    .from("restaurants")
    .select("name, phone")
    .eq("id", payment.restaurant_id)
    .single();

  if (restaurant.data?.phone) {
    const plan = getPlan(payment.plan_key);
    const paidDate = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " " + now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).replace(":", "h");

    const expiryDate = payment.new_expiry
      ? new Date(payment.new_expiry).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    await sendSms({
      phone: restaurant.data.phone,
      message: smsPaymentConfirmation({
        date: paidDate,
        amount: formatFCFA(payment.amount),
        planLabel: plan?.label || payment.plan_key,
        expiry: expiryDate,
        reference: payment.reference,
      }),
      restaurantId: payment.restaurant_id,
      type: "payment_confirmation",
    });
  }

  return NextResponse.json({ ok: true, status: "success" });
}
