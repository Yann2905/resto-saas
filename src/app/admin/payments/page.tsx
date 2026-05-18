"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Phone,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

// ── Types ───────────────────────────────────────────────────────

type PaymentRow = {
  id: string;
  restaurant_id: string;
  plan_key: string;
  amount: number;
  method: string;
  status: "pending" | "success" | "failed";
  reference: string;
  provider_ref: string | null;
  needs_review: boolean;
  paid_at: string | null;
  previous_expiry: string | null;
  new_expiry: string | null;
  created_at: string;
  updated_at: string;
  restaurants: { name: string; phone: string | null } | null;
};

type Filter = "to_review" | "confirmed" | "rejected";

// ── Constants ───────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  wave: "Wave",
  carte_bancaire: "Carte bancaire",
  autre: "Autre",
};

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "to_review", label: "A v\u00e9rifier" },
  { key: "confirmed", label: "Confirm\u00e9s" },
  { key: "rejected", label: "Rejet\u00e9s" },
];

// ── Helpers ─────────────────────────────────────────────────────

function isToReview(p: PaymentRow): boolean {
  return p.status === "success" && p.needs_review === true;
}

function isConfirmed(p: PaymentRow): boolean {
  if (p.status !== "success") return false;
  // needs_review explicitly false, or provider_ref starts with "reviewed:"
  if (p.needs_review === false) {
    return (
      p.provider_ref?.startsWith("reviewed:") || p.provider_ref === "reviewed"
    ) ?? false;
  }
  return false;
}

function isRejected(p: PaymentRow): boolean {
  return p.status === "failed";
}

function extractPayerPhone(providerRef: string | null): string | null {
  if (!providerRef) return null;
  // The declare route stores the phone directly, or prefixed after review
  const cleaned = providerRef
    .replace(/^reviewed:/, "")
    .replace(/^rejected:/, "");
  // If it looks like a phone number (digits, +, spaces)
  if (/^[\d+\s()-]{6,}$/.test(cleaned)) return cleaned;
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

// ── Component ───────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const { role } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("to_review");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── Fetch ───────────────────────────────────────────────────
  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      const json = await res.json();
      if (json.ok) {
        setPayments(json.payments as PaymentRow[]);
      }
    } catch (e) {
      console.error("[admin] fetch payments error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      await fetchPayments();
      if (cancelled) return;
    };
    doFetch();
    const interval = setInterval(() => {
      if (!cancelled) fetchPayments();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (
    paymentId: string,
    action: "confirm" | "reject",
  ) => {
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(
          "success",
          action === "confirm"
            ? "Paiement confirm\u00e9"
            : "Paiement rejet\u00e9 + abonnement r\u00e9tabli",
        );
        await fetchPayments();
      } else {
        showToast("error", json.error || "Erreur");
      }
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erreur r\u00e9seau");
    } finally {
    }
  };

  // ── Filtered list ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filter === "to_review") return isToReview(p);
      if (filter === "confirmed") return isConfirmed(p);
      if (filter === "rejected") return isRejected(p);
      return true;
    });
  }, [payments, filter]);

  const countByFilter = useMemo(() => {
    return {
      to_review: payments.filter(isToReview).length,
      confirmed: payments.filter(isConfirmed).length,
      rejected: payments.filter(isRejected).length,
    };
  }, [payments]);

  // ── Render ──────────────────────────────────────────────────
  if (role !== "superadmin") return null;

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap animate-fade-in-up">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Paiements
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              V\u00e9rification et validation des paiements d\u00e9clar\u00e9s
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchPayments();
            }}
            className="rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-all hover:scale-105 flex items-center gap-1.5 shadow-lg shadow-stone-900/10"
          >
            <RefreshCw className="w-4 h-4" aria-hidden /> Actualiser
          </button>
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3 mb-4 flex gap-1 overflow-x-auto">
          {FILTER_TABS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.key
                  ? f.key === "to_review"
                    ? "bg-amber-500 text-white"
                    : f.key === "confirmed"
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {f.key === "to_review" && (
                <Eye className="w-3.5 h-3.5" aria-hidden />
              )}
              {f.key === "confirmed" && (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
              )}
              {f.key === "rejected" && (
                <XCircle className="w-3.5 h-3.5" aria-hidden />
              )}
              {f.label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full text-[10px] font-bold px-1.5 ${
                  filter === f.key
                    ? "bg-white/20 text-white"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {countByFilter[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-stone-500">
            <span className="w-5 h-5 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <CreditCard className="w-10 h-10 text-stone-400" aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              Aucun paiement
            </h3>
            <p className="text-sm text-stone-500">
              {filter === "to_review"
                ? "Aucun paiement en attente de v\u00e9rification."
                : filter === "confirmed"
                  ? "Aucun paiement confirm\u00e9 pour le moment."
                  : "Aucun paiement rejet\u00e9."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p, i) => {
              const restaurantName =
                p.restaurants?.name || "Restaurant inconnu";
              const payerPhone = extractPayerPhone(p.provider_ref);
              const needsAction = isToReview(p);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border overflow-hidden animate-fade-in-up hover:shadow-md transition-shadow ${
                    needsAction
                      ? "border-amber-300 shadow-sm shadow-amber-100"
                      : p.status === "failed"
                        ? "border-red-200"
                        : "border-stone-200"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="p-4 sm:p-5">
                    {/* Top row: restaurant + status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm ${
                            needsAction
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950"
                              : p.status === "failed"
                                ? "bg-gradient-to-br from-red-400 to-red-600 text-white"
                                : "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                          }`}
                        >
                          {restaurantName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-stone-900 truncate">
                            {restaurantName}
                          </h3>
                          <div className="text-xs text-stone-500 mt-0.5">
                            <span className="font-mono">{p.reference}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge payment={p} />
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <Detail
                        label="Montant"
                        value={formatFCFA(p.amount)}
                        bold
                      />
                      <Detail
                        label="M\u00e9thode"
                        value={METHOD_LABELS[p.method] || p.method}
                      />
                      {payerPhone && (
                        <Detail
                          label="T\u00e9l\u00e9phone payeur"
                          value={payerPhone}
                          icon={
                            <Phone
                              className="w-3 h-3 text-stone-400"
                              aria-hidden
                            />
                          }
                        />
                      )}
                      <Detail label="Date" value={formatDate(p.created_at)} />
                    </div>

                    {/* Actions */}
                    {needsAction && (
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                        <button
                          onClick={() => handleAction(p.id, "reject")}
                          className="rounded-xl px-4 py-2.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" aria-hidden />
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleAction(p.id, "confirm")}
                          className="rounded-xl px-4 py-2.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5"
                            aria-hidden
                          />
                          Confirmer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-sm z-50 animate-fade-in-up rounded-2xl border shadow-xl backdrop-blur p-4 ${
            toast.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
              : "bg-red-50/95 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-start gap-2 text-sm">
            {toast.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            ) : (
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                aria-hidden
              />
            )}
            <span className="flex-1">{toast.msg}</span>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatusBadge({ payment }: { payment: PaymentRow }) {
  if (isToReview(payment)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        A v\u00e9rifier
      </span>
    );
  }
  if (isConfirmed(payment)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Confirm\u00e9
      </span>
    );
  }
  if (payment.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Rejet\u00e9
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-semibold text-stone-600">
      <Clock className="w-3 h-3" aria-hidden />
      {payment.status}
    </span>
  );
}

function Detail({
  label,
  value,
  bold,
  icon,
}: {
  label: string;
  value: string;
  bold?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
        {label}
      </div>
      <div
        className={`text-stone-700 flex items-center gap-1 ${bold ? "font-bold" : ""}`}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}
