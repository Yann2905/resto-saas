/**
 * Client SMS via Texto.
 *
 * Variables d'environnement requises :
 *   TEXTO_API_URL   – URL de l'API Texto (ex: https://api.texto.com/v1/sms)
 *   TEXTO_API_KEY   – Clé API Texto
 *   TEXTO_SENDER    – Nom expéditeur (ex: "RestoSaaS")
 */

import { createSupabaseAdminClient } from "./supabase-admin";
import type { SmsType } from "@/types";

const TEXTO_API_URL = process.env.TEXTO_API_URL || "";
const TEXTO_API_KEY = process.env.TEXTO_API_KEY || "";
const TEXTO_SENDER  = process.env.TEXTO_SENDER || "RestoSaaS";

export type SendSmsResult = { ok: true } | { ok: false; error: string };

/**
 * Envoie un SMS via Texto puis enregistre dans sms_logs.
 * Si TEXTO_API_URL n'est pas configuré, log en console (dev mode).
 */
export async function sendSms(params: {
  phone: string;
  message: string;
  restaurantId: string;
  type: SmsType;
}): Promise<SendSmsResult> {
  const { phone, message, restaurantId, type } = params;

  // ── Envoi via Texto ───────────────────────────────────────────
  if (TEXTO_API_URL && TEXTO_API_KEY) {
    try {
      const res = await fetch(TEXTO_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEXTO_API_KEY}`,
        },
        body: JSON.stringify({
          to: phone,
          from: TEXTO_SENDER,
          text: message,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("[SMS] Texto error:", res.status, body);
        return { ok: false, error: `Texto ${res.status}: ${body}` };
      }
    } catch (err) {
      console.error("[SMS] Texto network error:", err);
      return { ok: false, error: String(err) };
    }
  } else {
    // Dev mode — pas d'API Texto configurée
    console.log("[SMS DEV]", { to: phone, message });
  }

  // ── Log en base (dédup via index unique) ─────────────────────
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("sms_logs").insert({
      restaurant_id: restaurantId,
      type,
      phone,
      payload: message,
    });
  } catch {
    // Le log échoue si doublon (dedup index) — silencieux volontairement
  }

  return { ok: true };
}

// ── Templates SMS ──────────────────────────────────────────────

export function smsReminder(params: {
  paymentUrl: string;
}): string {
  return (
    `Votre abonnement expire bientot. Rechargez votre compte via :\n` +
    params.paymentUrl
  );
}

export function smsPaymentConfirmation(params: {
  date: string;       // ex: "14/05/2026 13h51"
  amount: string;     // ex: "15 000 FCFA"
  planLabel: string;  // ex: "Premium 3 mois"
  expiry: string;     // ex: "14/08/2026"
  reference: string;  // ex: "PAY2605141351A7F2"
}): string {
  return (
    `Rechargement effectue avec succes\n` +
    `Date : ${params.date}\n` +
    `Montant regle : ${params.amount}\n` +
    `Nouvelle Offre : ${params.planLabel}\n` +
    `Date d'expiration : ${params.expiry}\n` +
    `Reference : ${params.reference}`
  );
}
