import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { markTokenUsed } from "@/lib/payment-tokens";
import { getPlan } from "@/lib/payment-plans";
import { sendSms, smsPaymentConfirmation } from "@/lib/sms";
import { formatFCFA } from "@/lib/format";

/**
 * POST /api/payment/declare
 *
 * Le client déclare avoir payé ("J'ai payé").
 * Active immédiatement l'abonnement mais marque le paiement
 * comme needs_review pour vérification ultérieure par l'admin.
 *
 * Body: { reference, phone }
 *   - reference : référence du paiement
 *   - phone     : numéro de téléphone du client payeur
 */
export async function POST(request: Request) {
  // Vérifier que l'utilisateur est connecté
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalide" },
      { status: 400 },
    );
  }

  const { reference, phone } = body as {
    reference?: string;
    phone?: string;
  };

  if (!reference) {
    return NextResponse.json(
      { ok: false, error: "Référence manquante" },
      { status: 400 },
    );
  }

  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "Numéro de téléphone manquant" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // Trouver le paiement
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

  // Déjà traité ?
  if (payment.status !== "pending") {
    return NextResponse.json({
      ok: true,
      message: "Paiement déjà traité",
      status: payment.status,
    });
  }

  const now = new Date();

  // 1. Paiement → success + needs_review + payer_phone dans provider_ref
  const { error: updateErr } = await admin
    .from("payments")
    .update({
      status: "success",
      paid_at: now.toISOString(),
      needs_review: true,
      provider_ref: phone,
    })
    .eq("id", payment.id);

  if (updateErr) {
    console.error("[Payment declare] Update error:", updateErr);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du paiement" },
      { status: 500 },
    );
  }

  // 2. Restaurant → nouvelle date expiration
  if (payment.new_expiry) {
    const { error: expiryErr } = await admin
      .from("restaurants")
      .update({ subscription_expires_at: payment.new_expiry })
      .eq("id", payment.restaurant_id);

    if (expiryErr) {
      console.error("[Payment declare] Expiry update error:", expiryErr);
    }
  }

  // 3. Token → marqué comme utilisé
  if (payment.token_id) {
    await markTokenUsed(payment.token_id);
  }

  // 4. SMS de confirmation au restaurant
  const restaurant = await admin
    .from("restaurants")
    .select("name, phone")
    .eq("id", payment.restaurant_id)
    .single();

  if (restaurant.data?.phone) {
    const plan = getPlan(payment.plan_key);
    const paidDate =
      now.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " " +
      now
        .toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(":", "h");

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
