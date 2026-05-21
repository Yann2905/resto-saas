import { createHmac } from "crypto";

const API_KEY = process.env.GENIUSPAY_API_KEY!;
const API_SECRET = process.env.GENIUSPAY_API_SECRET!;
const BASE_URL = process.env.GENIUSPAY_BASE_URL!;

const headers = {
  "X-API-Key": API_KEY,
  "X-API-Secret": API_SECRET,
  "Content-Type": "application/json",
};

/* ── Types ───────────────────────────────────────────────────── */

export type GeniusPaymentMethod =
  | "wave"
  | "orange_money"
  | "mtn_money"
  | "moov_money"
  | "card";

export type GeniusPayStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";

export type CreatePaymentParams = {
  amount: number;
  currency?: string;
  payment_method?: GeniusPaymentMethod;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  success_url?: string;
  error_url?: string;
  metadata?: Record<string, string>;
};

export type GeniusPayment = {
  id: number;
  reference: string;
  amount: number;
  fees: number;
  net_amount: number;
  status: GeniusPayStatus;
  payment_url: string | null;
  checkout_url: string;
  gateway: string;
  environment: string;
  metadata: Record<string, string>;
};

export type GeniusWebhookPayload = {
  id: string;
  event: string;
  timestamp: number;
  created_at: string;
  data: {
    object: string;
    id: number;
    reference: string;
    amount: number;
    currency: string;
    fees: number;
    net_amount: number;
    status: string;
    payment_method: string;
    provider: string;
    customer_name: string | null;
    customer_phone: string | null;
    metadata: Record<string, string>;
  };
  environment: string;
  api_version: string;
};

/* ── API Calls ───────────────────────────────────────────────── */

export async function createPayment(
  params: CreatePaymentParams,
): Promise<{ success: boolean; data?: GeniusPayment; error?: string }> {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    console.error("[GeniusPay] Create payment error:", json);
    return {
      success: false,
      error: json.error?.message || json.message || "Erreur Genius Pay",
    };
  }

  return { success: true, data: json.data };
}

export async function getPayment(
  reference: string,
): Promise<{ success: boolean; data?: GeniusPayment; error?: string }> {
  const res = await fetch(`${BASE_URL}/payments/${reference}`, {
    method: "GET",
    headers,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    return {
      success: false,
      error: json.error?.message || "Transaction introuvable",
    };
  }

  return { success: true, data: json.data };
}

/* ── Webhook Signature Verification ──────────────────────────── */

export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  const expected = createHmac("sha256", API_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return signature === expected;
}
