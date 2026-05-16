import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { markTokenUsed } from "@/lib/payment-tokens";
import { getPlan } from "@/lib/payment-plans";
import { sendSms, smsPaymentConfirmation } from "@/lib/sms";
import { formatFCFA } from "@/lib/format";

/**
 * POST /api/payment/confirm
 *
 * Confirme un paiement manuellement (flow sans agrégateur).
 * Nécessite que l'utilisateur soit authentifié.
 *
 * Body: { reference }
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

  const { reference } = body as { reference?: string };
  if (!reference) {
    return NextResponse.json(
      { ok: false, error: "Référence manquante" },
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

  // 1. Paiement → success
  await admin
    .from("payments")
    .update({
      status: "success",
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

    const smsResult = await sendSms({
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

    return NextResponse.json({ ok: true, status: "success", sms: smsResult });
  }

  return NextResponse.json({ ok: true, status: "success" });
}
