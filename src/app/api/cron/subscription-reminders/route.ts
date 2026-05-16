import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createPaymentToken } from "@/lib/payment-tokens";
import { sendSms, smsReminder } from "@/lib/sms";
import type { SmsType } from "@/types";

/**
 * GET /api/cron/subscription-reminders
 *
 * Appelé quotidiennement (Vercel Cron, GitHub Actions, ou curl).
 * Protégé par CRON_SECRET dans les headers.
 *
 * Envoie des rappels SMS à J-7, J-5, J-0 avant expiration.
 */

const CRON_SECRET = process.env.CRON_SECRET || "";

const REMINDER_WINDOWS: { days: number; type: SmsType }[] = [
  { days: 7, type: "reminder_7d" },
  { days: 5, type: "reminder_5d" },
  { days: 0, type: "reminder_0d" },
];

export async function GET(request: Request) {
  // ── Auth cron ───────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://votre-domaine.com";
  const results: string[] = [];

  for (const window of REMINDER_WINDOWS) {
    // Date cible : aujourd'hui + N jours (pour J-7 on cherche ceux qui expirent dans 7 jours)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + window.days);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Restaurants qui expirent ce jour-là et ont un téléphone
    const { data: restaurants, error } = await admin
      .from("restaurants")
      .select("id, name, phone, subscription_expires_at")
      .gte("subscription_expires_at", dayStart.toISOString())
      .lte("subscription_expires_at", dayEnd.toISOString())
      .eq("active", true)
      .not("phone", "is", null);

    if (error || !restaurants) continue;

    for (const resto of restaurants) {
      if (!resto.phone) continue;

      // Vérifier si déjà envoyé aujourd'hui (l'index unique sms_logs_dedup_idx
      // empêchera un doublon, mais on évite aussi de créer un token inutile)
      const { data: existing } = await admin
        .from("sms_logs")
        .select("id")
        .eq("restaurant_id", resto.id)
        .eq("type", window.type)
        .gte("sent_at", dayStart.toISOString())
        .lte("sent_at", dayEnd.toISOString())
        .maybeSingle();

      if (existing) continue;

      // Créer un token de paiement
      const tokenRow = await createPaymentToken(resto.id);
      const paymentUrl = `${baseUrl}/payment/${tokenRow.token}`;

      // Envoyer le SMS
      const smsResult = await sendSms({
        phone: resto.phone,
        message: smsReminder({ paymentUrl }),
        restaurantId: resto.id,
        type: window.type,
      });

      results.push(
        `${resto.name} (${window.type}): ${smsResult.ok ? "OK" : "FAIL"}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    sent: results.length,
    details: results,
  });
}
