import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireSuperadmin } from "@/lib/server-auth";
import { sendSms } from "@/lib/sms";

/**
 * GET /api/admin/payments
 *
 * Liste les paiements des 30 derniers jours avec le nom du restaurant.
 * Requiert le role superadmin.
 */
export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: payments, error } = await admin
    .from("payments")
    .select(
      "id, restaurant_id, plan_key, amount, method, status, reference, provider_ref, needs_review, paid_at, previous_expiry, new_expiry, created_at, updated_at, restaurants(name, phone)",
    )
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, payments: payments ?? [] },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
  );
}

/**
 * PATCH /api/admin/payments
 *
 * Admin confirme ou rejette un paiement.
 * Body: { paymentId: string, action: "confirm" | "reject" }
 *
 * - confirm : marque le paiement comme verifie (needs_review = false)
 * - reject  : statut → failed, rollback subscription, SMS au restaurant
 */
export async function PATCH(request: Request) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalide" },
      { status: 400 },
    );
  }

  const { paymentId, action } = body as {
    paymentId?: string;
    action?: string;
  };

  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json(
      { ok: false, error: "paymentId manquant" },
      { status: 400 },
    );
  }

  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json(
      { ok: false, error: "action invalide (confirm | reject)" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // Fetch the payment
  const { data: payment, error: findErr } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (findErr || !payment) {
    return NextResponse.json(
      { ok: false, error: "Paiement introuvable" },
      { status: 404 },
    );
  }

  // ── CONFIRM ─────────────────────────────────────────────────────
  if (action === "confirm") {
    const { error: updateErr } = await admin
      .from("payments")
      .update({
        needs_review: false,
        provider_ref: payment.provider_ref
          ? `reviewed:${payment.provider_ref}`
          : "reviewed",
      })
      .eq("id", paymentId);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  // ── REJECT ──────────────────────────────────────────────────────
  // 1. Mark payment as failed
  const { error: rejectErr } = await admin
    .from("payments")
    .update({
      status: "failed",
      needs_review: false,
      provider_ref: payment.provider_ref
        ? `rejected:${payment.provider_ref}`
        : "rejected",
    })
    .eq("id", paymentId);

  if (rejectErr) {
    return NextResponse.json(
      { ok: false, error: rejectErr.message },
      { status: 500 },
    );
  }

  // 2. Rollback subscription: restore previous_expiry on the restaurant
  if (payment.previous_expiry) {
    await admin
      .from("restaurants")
      .update({ subscription_expires_at: payment.previous_expiry })
      .eq("id", payment.restaurant_id);
  }

  // 3. Send SMS to restaurant phone
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, phone")
    .eq("id", payment.restaurant_id)
    .maybeSingle();

  if (restaurant?.phone) {
    await sendSms({
      phone: restaurant.phone,
      message:
        `Votre paiement ref ${payment.reference} de ${payment.amount} FCFA a ete rejete. ` +
        `Votre abonnement a ete retabli a son etat precedent. ` +
        `Veuillez nous contacter pour plus d'informations.`,
      restaurantId: payment.restaurant_id,
      type: "payment_confirmation",
    });
  }

  return NextResponse.json({ ok: true, status: "rejected" });
}
