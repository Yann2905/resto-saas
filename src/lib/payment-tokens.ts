import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "./supabase-admin";
import type { PaymentTokenRow } from "@/types";

const TOKEN_LENGTH = 32;
const TOKEN_TTL_HOURS = 72;

/** Génère un token cryptographiquement sûr (hex, 32 chars). */
export function generateToken(): string {
  return randomBytes(TOKEN_LENGTH / 2).toString("hex");
}

/** Crée un payment_token en base et retourne la row. */
export async function createPaymentToken(
  restaurantId: string,
): Promise<PaymentTokenRow> {
  const admin = createSupabaseAdminClient();
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("payment_tokens")
    .insert({ restaurant_id: restaurantId, token, expires_at: expiresAt })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Impossible de créer le token: ${error?.message}`);
  }
  return data as PaymentTokenRow;
}

/**
 * Résout un token : retourne la row + les infos restaurant si valide.
 * Retourne null si token inexistant, expiré ou déjà utilisé.
 */
export async function resolvePaymentToken(token: string) {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("payment_tokens")
    .select("*, restaurants(id, slug, name, phone, active, subscription_expires_at)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as PaymentTokenRow & {
    restaurants: {
      id: string;
      slug: string;
      name: string;
      phone: string | null;
      active: boolean;
      subscription_expires_at: string | null;
    };
  };

  // Expiré ?
  if (new Date(row.expires_at) < new Date()) return null;
  // Déjà utilisé ?
  if (row.used) return null;

  return row;
}

/** Marque un token comme utilisé. */
export async function markTokenUsed(tokenId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("payment_tokens")
    .update({ used: true })
    .eq("id", tokenId);
}
