/**
 * Client SMS via LeTexto.
 *
 * Variables d'environnement requises :
 *   LETEXTO_API_URL  – URL de base (ex: https://api.letexto.com)
 *   LETEXTO_API_KEY  – Clé API LeTexto
 *   LETEXTO_SENDER   – Nom expéditeur (ex: "RestoSaaS")
 */

import { createSupabaseAdminClient } from "./supabase-admin";
import type { SmsType } from "@/types";

const LETEXTO_API_URL = process.env.LETEXTO_API_URL || process.env.TEXTO_API_URL || "";
const LETEXTO_API_KEY = process.env.LETEXTO_API_KEY || process.env.TEXTO_API_KEY || "";
const LETEXTO_SENDER  = process.env.LETEXTO_SENDER || process.env.TEXTO_SENDER || "RestoSaaS";

export type SendSmsResult = { ok: true } | { ok: false; error: string };

/**
 * Envoie un SMS via Texto puis enregistre dans sms_logs.
 * Si TEXTO_API_URL n'est pas configuré, log en console (dev mode).
 */
/**
 * Normalise un numéro de téléphone au format international.
 * Ex: "0585743342" → "225585743342" (Côte d'Ivoire par défaut)
 *     "+225 05 85 74 33 42" → "2250585743342"
 *     "2250585743342" → "2250585743342" (déjà bon)
 */
function normalizePhone(raw: string): string {
  // Retirer espaces, tirets, points, parenthèses
  let phone = raw.replace(/[\s\-.()+]/g, "");
  // Si commence par 00 (format international alternatif)
  if (phone.startsWith("00")) phone = phone.slice(2);
  // Si commence par 0 (format local Côte d'Ivoire), ajouter indicatif 225
  if (phone.startsWith("0") && phone.length <= 10) {
    phone = "225" + phone;
  }
  return phone;
}

export async function sendSms(params: {
  phone: string;
  message: string;
  restaurantId: string;
  type: SmsType;
}): Promise<SendSmsResult> {
  const { phone: rawPhone, message, restaurantId, type } = params;
  const phone = normalizePhone(rawPhone);

  // ── Envoi via LeTexto ─────────────────────────────────────────
  if (LETEXTO_API_URL && LETEXTO_API_KEY) {
    try {
      const baseUrl = LETEXTO_API_URL.replace(/\/+$/, "");
      const endpoint = `${baseUrl}/v1/messages/send`;

      console.log("[SMS] Sending to", phone, "via", endpoint);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LETEXTO_API_KEY}`,
        },
        body: JSON.stringify({
          from: LETEXTO_SENDER,
          to: phone,
          content: message,
        }),
      });

      const body = await res.text();
      if (!res.ok) {
        console.error("[SMS] LeTexto error:", res.status, body);
        return { ok: false, error: `LeTexto ${res.status}: ${body}` };
      }
      console.log("[SMS] LeTexto success:", body);
    } catch (err) {
      console.error("[SMS] LeTexto network error:", err);
      return { ok: false, error: String(err) };
    }
  } else {
    // Dev mode — pas d'API LeTexto configurée
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
