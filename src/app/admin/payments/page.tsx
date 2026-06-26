"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

type PaymentRow = {
  id: string;
  restaurant_id: string;
  plan_key: string;
  amount: number;
  method: string;
  status: "pending" | "success" | "failed";
  reference: string;
  provider_ref: string | null;
  paid_at: string | null;
  new_expiry: string | null;
  created_at: string;
  restaurants: { name: string; phone: string | null } | null;
};

type Filter = "all" | "success" | "pending" | "failed";

const PLAN_LABELS: Record<string, string> = {
  "1_month": "1 mois",
  "2_months": "2 mois",
  "3_months": "3 mois",
  "4_months": "4 mois",
  "5_months": "5 mois",
};

const FILTER_TABS: { key: Filter; label: string; color: string }[] = [
  { key: "all", label: "Tous", color: "bg-[#722F37] text-white" },
  { key: "success", label: "Payés", color: "bg-emerald-600 text-white" },
  { key: "pending", label: "En attente", color: "bg-[#C8963E] text-white" },
  { key: "failed", label: "Échoués", color: "bg-red-600 text-white" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function AdminPaymentsPage() {
  const { role } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      const json = await res.json();
      if (json.ok) setPayments(json.payments as PaymentRow[]);
    } catch (e) {
      console.error("[admin] fetch payments error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter((p) => p.status === filter);
  }, [payments, filter]);

  const counts = useMemo(() => {
    const c = { all: payments.length, success: 0, pending: 0, failed: 0 };
    for (const p of payments) {
      if (p.status === "success") c.success++;
      else if (p.status === "pending") c.pending++;
      else if (p.status === "failed") c.failed++;
    }
    return c;
  }, [payments]);

  const totalRevenue = useMemo(
    () => payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0),
    [payments],
  );

  if (role !== "superadmin") return null;

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Paiements
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Suivi des paiements via Genius Pay · 30 derniers jours
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchPayments();
            }}
            className="rounded-full bg-[#722F37] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-all flex items-center gap-1.5 shadow-lg shadow-stone-900/10"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total reçu" value={formatFCFA(totalRevenue)} color="emerald" />
          <KpiCard label="Payés" value={String(counts.success)} color="emerald" />
          <KpiCard label="En attente" value={String(counts.pending)} color="gold" />
          <KpiCard label="Échoués" value={String(counts.failed)} color="red" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3 mb-4 flex gap-1 overflow-x-auto">
          {FILTER_TABS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.key ? f.color : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {f.key === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {f.key === "pending" && <Clock className="w-3.5 h-3.5" />}
              {f.key === "failed" && <XCircle className="w-3.5 h-3.5" />}
              {f.label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full text-[10px] font-bold px-1.5 ${
                  filter === f.key ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-stone-500">
            <span className="w-5 h-5 border-2 border-stone-300 border-t-[#C8963E] rounded-full animate-spin" />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <CreditCard className="w-10 h-10 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Aucun paiement</h3>
            <p className="text-sm text-stone-500">
              {filter === "all"
                ? "Aucun paiement sur les 30 derniers jours."
                : `Aucun paiement avec le statut "${FILTER_TABS.find((f) => f.key === filter)?.label}".`}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p, i) => (
              <PaymentCard key={p.id} payment={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PaymentCard({ payment: p, index }: { payment: PaymentRow; index: number }) {
  const name = p.restaurants?.name || "Restaurant inconnu";
  const geniusUrl = p.provider_ref && !p.provider_ref.startsWith("reviewed")
    ? `https://pay.genius.ci/checkout/${p.provider_ref}`
    : null;

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow ${
        p.status === "success"
          ? "border-emerald-200"
          : p.status === "pending"
            ? "border-[#d4a94e] shadow-sm shadow-[#C8963E]/10"
            : "border-red-200"
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${
                p.status === "success"
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                  : p.status === "pending"
                    ? "bg-gradient-to-br from-[#C8963E] to-[#a07832] text-white"
                    : "bg-gradient-to-br from-red-400 to-red-600 text-white"
              }`}
            >
              {name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 truncate">{name}</h3>
              <span className="text-xs text-stone-500 font-mono">{p.reference}</span>
            </div>
          </div>
          <StatusBadge status={p.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Detail label="Montant" value={formatFCFA(p.amount)} bold />
          <Detail label="Forfait" value={PLAN_LABELS[p.plan_key] || p.plan_key} />
          <Detail label="Date" value={formatDate(p.created_at)} />
          {p.status === "success" && p.new_expiry && (
            <Detail label="Nouvelle expiration" value={formatDate(p.new_expiry)} />
          )}
        </div>

        {geniusUrl && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <a
              href={geniusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir sur Genius Pay ({p.provider_ref})
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
        <Check className="w-3 h-3" /> Payé
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e0c07a] bg-[#C8963E]/5 px-2.5 py-1 text-[10px] font-semibold text-[#6e5a20]">
        <Clock className="w-3 h-3" /> En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-800">
      <XCircle className="w-3 h-3" /> Échoué
    </span>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "gold" | "red";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gold: "bg-[#C8963E]/5 text-[#8a6828] border-[#e0c07a]",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[color]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function Detail({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
        {label}
      </div>
      <div className={`text-stone-700 ${bold ? "font-bold" : ""}`}>{value}</div>
    </div>
  );
}
