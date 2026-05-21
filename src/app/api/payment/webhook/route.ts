import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { verifyWebhookSignature, type GeniusWebhookPayload } from "@/lib/genius-pay";
import { markTokenUsed } from "@/lib/payment-tokens";
import { getPlan } from "@/lib/payment-plans";
import { sendSms, smsPaymentConfirmation } from "@/lib/sms";
import { formatFCFA } from "@/lib/format";

/**
 * POST /api/payment/webhook
 *
 * Reçoit les notifications de Genius Pay (payment.success, payment.failed, etc.)
 * et met à jour le paiement + l'abonnement en conséquence.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature") || "";
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const event = request.headers.get("x-webhook-event") || "";

  const rawBody = await request.text();

  // Vérifier la signature
  if (signature && timestamp) {
    const valid = verifyWebhookSignature(signature, timestamp, rawBody);
    if (!valid) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json(
        { ok: false, error: "Signature invalide" },
        { status: 401 },
      );
    }
  }

  let payload: GeniusWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body invalide" },
      { status: 400 },
    );
  }

  console.log(`[Webhook] Event: ${event || payload.event}, Ref: ${payload.data?.reference}`);

  const eventType = event || payload.event;

  if (eventType === "payment.success") {
    await handlePaymentSuccess(payload);
  } else if (eventType === "payment.failed" || eventType === "payment.cancelled" || eventType === "payment.expired") {
    await handlePaymentFailed(payload);
  }

  // Toujours répondre 200 pour que Genius Pay ne retry pas
  return NextResponse.json({ ok: true, received: eventType });
}

async function handlePaymentSuccess(payload: GeniusWebhookPayload) {
  const admin = createSupabaseAdminClient();
  const geniusRef = payload.data.reference;
  const metadata = payload.data.metadata;

  // Trouver le paiement local via provider_ref (= genius reference)
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("provider_ref", geniusRef)
    .maybeSingle();

  if (!payment) {
    // Essayer via metadata.payment_id
    if (metadata?.payment_id) {
      const { data: p2 } = await admin
        .from("payments")
        .select("*")
        .eq("id", metadata.payment_id)
        .maybeSingle();
      if (p2) return processSuccess(admin, p2, payload);
    }
    console.error("[Webhook] Payment not found for ref:", geniusRef);
    return;
  }

  return processSuccess(admin, payment, payload);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processSuccess(admin: any, payment: any, payload: GeniusWebhookPayload) {
  // Déjà traité ?
  if (payment.status === "success") {
    console.log("[Webhook] Payment already processed:", payment.reference);
    return;
  }

  const now = new Date();

  // 1. Paiement → success
  await admin
    .from("payments")
    .update({
      status: "success",
      paid_at: now.toISOString(),
      provider_ref: payload.data.reference,
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
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, phone")
    .eq("id", payment.restaurant_id)
    .maybeSingle();

  if (restaurant?.phone) {
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
      phone: restaurant.phone,
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

  console.log("[Webhook] Payment success processed:", payment.reference);
}

async function handlePaymentFailed(payload: GeniusWebhookPayload) {
  const admin = createSupabaseAdminClient();
  const geniusRef = payload.data.reference;

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("provider_ref", geniusRef)
    .maybeSingle();

  if (!payment || payment.status !== "pending") return;

  await admin
    .from("payments")
    .update({ status: "failed" })
    .eq("id", payment.id);

  console.log("[Webhook] Payment failed/cancelled:", payment.reference);
}
