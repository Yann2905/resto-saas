import { supabase } from "./supabase";
import {
  CashSession,
  CashSessionRow,
  CashSessionSummary,
  CashExpense,
  CashExpenseRow,
  OrderPaymentMethod,
  mapCashSession,
  mapCashExpense,
} from "@/types";

export async function getActiveCashSession(
  restaurantId: string
): Promise<CashSession | null> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapCashSession(data as CashSessionRow);
}

export async function openCashSession(
  restaurantId: string,
  openingFloat: number
): Promise<{ ok: boolean; session?: CashSession; error?: string }> {
  // Vérifier s'il y a déjà une session ouverte
  const active = await getActiveCashSession(restaurantId);
  if (active) {
    return { ok: false, error: "Une session de caisse est déjà ouverte." };
  }

  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      restaurant_id: restaurantId,
      opening_float: openingFloat,
      status: "open",
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Erreur lors de l'ouverture de caisse." };
  }

  return { ok: true, session: mapCashSession(data as CashSessionRow) };
}

export async function closeCashSession(
  sessionId: string,
  closingCashActual: number
): Promise<{ ok: boolean; summary?: CashSessionSummary; error?: string }> {
  // Récupérer d'abord le résumé pour le solde théorique
  const summaryRes = await getCashSessionSummary(sessionId);
  const expectedCash = summaryRes ? summaryRes.expectedCash : 0;

  const { error } = await supabase
    .from("cash_sessions")
    .update({
      status: "closed",
      closing_cash_actual: closingCashActual,
      closing_cash_expected: expectedCash,
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const updatedSummary = await getCashSessionSummary(sessionId);
  return { ok: true, summary: updatedSummary || undefined };
}

export async function getCashSessionSummary(
  sessionId: string
): Promise<CashSessionSummary | null> {
  const { data, error } = await supabase.rpc("get_cash_session_summary", {
    p_session_id: sessionId,
  });

  if (error || !data) return null;

  const res = data as Record<string, unknown>;
  return {
    sessionId: res.session_id as string,
    restaurantId: res.restaurant_id as string,
    status: res.status as "open" | "closed",
    openingFloat: Number(res.opening_float || 0),
    openedAt: res.opened_at as string,
    closedAt: (res.closed_at as string) || null,
    totalCash: Number(res.total_cash || 0),
    totalMomo: Number(res.total_momo || 0),
    totalCard: Number(res.total_card || 0),
    totalOther: Number(res.total_other || 0),
    totalSales: Number(res.total_sales || 0),
    ordersCount: Number(res.orders_count || 0),
    totalExpenses: Number(res.total_expenses || 0),
    expectedCash: Number(res.expected_cash || 0),
    closingCashActual: res.closing_cash_actual !== null ? Number(res.closing_cash_actual) : null,
    closingCashExpected: res.closing_cash_expected !== null ? Number(res.closing_cash_expected) : null,
  };
}

export type ProcessPaymentResult =
  | {
      ok: true;
      data: {
        orderId: string;
        total: number;
        paymentMethod: OrderPaymentMethod;
        amountReceived: number;
        changeGiven: number;
        paidAt: string;
      };
    }
  | { ok: false; error: string };

export async function processOrderPayment(
  orderId: string,
  paymentMethod: OrderPaymentMethod,
  amountReceived?: number
): Promise<ProcessPaymentResult> {
  const { data, error } = await supabase.rpc("process_order_payment", {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
    p_amount_received: amountReceived ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const res = data as Record<string, unknown>;
  return {
    ok: true,
    data: {
      orderId: res.order_id as string,
      total: Number(res.total),
      paymentMethod: res.payment_method as OrderPaymentMethod,
      amountReceived: Number(res.amount_received),
      changeGiven: Number(res.change_given),
      paidAt: res.paid_at as string,
    },
  };
}

export async function listCashSessions(
  restaurantId: string
): Promise<CashSession[]> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("opened_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return (data as CashSessionRow[]).map(mapCashSession);
}

export async function addCashExpense(
  sessionId: string,
  restaurantId: string,
  label: string,
  amount: number
): Promise<{ ok: boolean; expense?: CashExpense; error?: string }> {
  const { data, error } = await supabase
    .from("cash_expenses")
    .insert({ cash_session_id: sessionId, restaurant_id: restaurantId, label, amount })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Erreur" };
  }
  return { ok: true, expense: mapCashExpense(data as CashExpenseRow) };
}

export async function listCashExpenses(
  sessionId: string
): Promise<CashExpense[]> {
  const { data, error } = await supabase
    .from("cash_expenses")
    .select("*")
    .eq("cash_session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as CashExpenseRow[]).map(mapCashExpense);
}
