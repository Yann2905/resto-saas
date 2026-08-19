"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  Banknote,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Lock,
  Minus,
  Plus,
  Printer,
  Smartphone,
  TrendingUp,
  Unlock,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { CashSession, CashSessionSummary, CashExpense, Order, OrderRow, mapOrder } from "@/types";
import {
  listCashSessions,
  getCashSessionSummary,
  getActiveCashSession,
  addCashExpense,
  listCashExpenses,
  listSessionOrders,
} from "@/lib/cash-register";
import { formatFCFA } from "@/lib/format";
import { getPlanLimits, type FeatureOverrides } from "@/lib/plan-limits";
import ReceiptPrintModal from "@/app/dashboard/orders/_components/receipt-modal";

type SessionWithSummary = {
  session: CashSession;
  summary: CashSessionSummary | null;
};

export default function CaissePage() {
  const { user, restaurant, role, loading } = useAuth();
  const [sessions, setSessions] = useState<SessionWithSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limits = getPlanLimits(
    restaurant?.plan,
    restaurant?.featureOverrides as FeatureOverrides,
    restaurant?.isPartner
  );

  useEffect(() => {
    if (!loading && !user && !role) window.location.href = "/dashboard/login";
  }, [loading, user, role]);

  const restaurantId = restaurant?.id ?? null;

  const loadSessions = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingSessions(true);
    const list = await listCashSessions(restaurantId);
    const withSummaries: SessionWithSummary[] = await Promise.all(
      list.map(async (s) => ({
        session: s,
        summary: await getCashSessionSummary(s.id),
      }))
    );
    setSessions(withSummaries);
    setLoadingSessions(false);
  }, [restaurantId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (loading || !restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
          Chargement…
        </div>
      </main>
    );
  }

  if (!limits.cashRegister) {
    return (
      <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Lock className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Caisse enregistreuse</h2>
          <p className="text-sm text-stone-500">
            Cette fonctionnalité est disponible sur le plan Pro ou Business.
          </p>
        </div>
      </main>
    );
  }

  const activeSession = sessions.find((s) => s.session.status === "open");
  const closedSessions = sessions.filter((s) => s.session.status === "closed");

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, SessionWithSummary[]>();
    for (const s of closedSessions) {
      const d = new Date(s.session.openedAt).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(s);
    }
    return Array.from(groups.entries());
  }, [closedSessions]);

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Historique de Caisse
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Sessions passées, ventes et sorties de caisse
          </p>
        </div>

        {/* Session active */}
        {activeSession && (
          <ActiveSessionCard
            data={activeSession}
            restaurantId={restaurantId!}
            onExpenseAdded={loadSessions}
          />
        )}

        {/* Sessions fermées */}
        {loadingSessions ? (
          <div className="text-center py-16">
            <span className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin inline-block" />
          </div>
        ) : closedSessions.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 font-medium">Aucune session clôturée</p>
            <p className="text-xs text-stone-400 mt-1">
              Les sessions passées apparaîtront ici après clôture.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDate.map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {date}
                </h3>
                <div className="space-y-3">
                  {items.map((s) => (
                    <ClosedSessionCard
                      key={s.session.id}
                      data={s}
                      expanded={expandedId === s.session.id}
                      onToggle={() =>
                        setExpandedId(
                          expandedId === s.session.id ? null : s.session.id
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ActiveSessionCard({
  data,
  restaurantId,
  onExpenseAdded,
}: {
  data: SessionWithSummary;
  restaurantId: string;
  onExpenseAdded: () => void;
}) {
  const { summary } = data;
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [loadedOrders, setLoadedOrders] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const loadExpenses = useCallback(async () => {
    const list = await listCashExpenses(data.session.id);
    setExpenses(list);
  }, [data.session.id]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    if (showOrders && !loadedOrders) {
      listSessionOrders(data.session.id).then((rows) => {
        setOrders(rows.map((r) => mapOrder(r as OrderRow)));
        setLoadedOrders(true);
      });
    }
  }, [showOrders, loadedOrders, data.session.id]);

  const handleExpenseAdded = () => {
    setShowExpenseModal(false);
    loadExpenses();
    onExpenseAdded();
  };

  return (
    <div className="mb-6 bg-slate-900 rounded-2xl p-5 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Unlock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Session en cours</div>
            <div className="text-[11px] text-slate-400">
              Depuis {new Date(data.session.openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ArrowDownCircle className="w-3.5 h-3.5" />
          Sortie de caisse
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Fond initial" value={formatFCFA(summary?.openingFloat ?? 0)} color="text-slate-300" />
        <MiniStat label="Ventes Cash" value={formatFCFA(summary?.totalCash ?? 0)} color="text-emerald-400" icon={<Banknote className="w-3 h-3" />} />
        <MiniStat label="Ventes MoMo" value={formatFCFA(summary?.totalMomo ?? 0)} color="text-blue-400" icon={<Smartphone className="w-3 h-3" />} />
        <MiniStat label="Sorties" value={`-${formatFCFA(summary?.totalExpenses ?? 0)}`} color="text-red-400" icon={<ArrowDownCircle className="w-3 h-3" />} />
      </div>

      {/* MoMo breakdown */}
      {summary && summary.totalMomo > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 mb-4">
          <div className="text-[10px] text-blue-300/70 font-semibold uppercase tracking-wider mb-2">Détail Mobile Money</div>
          <div className="grid grid-cols-2 gap-2">
            {summary.momoOrange > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full bg-orange-500" />Orange Money</span>
                <span className="text-orange-400 font-bold">{formatFCFA(summary.momoOrange)}</span>
              </div>
            )}
            {summary.momoWave > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full bg-blue-500" />Wave</span>
                <span className="text-blue-300 font-bold">{formatFCFA(summary.momoWave)}</span>
              </div>
            )}
            {summary.momoMtn > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full bg-yellow-500" />MTN Money</span>
                <span className="text-yellow-400 font-bold">{formatFCFA(summary.momoMtn)}</span>
              </div>
            )}
            {summary.momoMoov > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full bg-cyan-500" />Moov Money</span>
                <span className="text-cyan-400 font-bold">{formatFCFA(summary.momoMoov)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-3">
        <span className="text-xs text-slate-400 font-medium">Solde théorique caisse</span>
        <span className="text-lg font-extrabold text-amber-400">{formatFCFA(summary?.expectedCash ?? 0)}</span>
      </div>

      {/* Orders history */}
      <div className="mt-3">
        <button
          onClick={() => setShowOrders(!showOrders)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition py-1"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {summary?.ordersCount ?? 0} commande{(summary?.ordersCount ?? 0) > 1 ? "s" : ""}
          </span>
          {showOrders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showOrders && (
          <div className="space-y-1.5 mt-2">
            {!loadedOrders ? (
              <div className="text-center py-3">
                <span className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin inline-block" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">Aucune commande</p>
            ) : (
              orders.map((o) => (
                <OrderHistoryRow key={o.id} order={o} onViewReceipt={() => setReceiptOrder(o)} dark />
              ))
            )}
          </div>
        )}
      </div>

      {/* Expenses list */}
      {expenses.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowExpenses(!showExpenses)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition py-1"
          >
            <span>{expenses.length} sortie{expenses.length > 1 ? "s" : ""} enregistrée{expenses.length > 1 ? "s" : ""}</span>
            {showExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showExpenses && (
            <div className="space-y-1.5 mt-2">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2 text-xs">
                  <div>
                    <span className="text-slate-200 font-medium">{e.label}</span>
                    <span className="text-slate-500 ml-2">
                      {new Date(e.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="text-red-400 font-bold">-{formatFCFA(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showExpenseModal && (
        <ExpenseModal
          sessionId={data.session.id}
          restaurantId={restaurantId}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={handleExpenseAdded}
        />
      )}

      {receiptOrder && (
        <ReceiptPrintModal
          order={receiptOrder}
          restaurant={null}
          isOpen
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  sessionId,
  restaurantId,
  onClose,
  onSuccess,
}: {
  sessionId: string;
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount.replace(/\D/g, "") || "0", 10);
    if (!label.trim() || parsedAmount <= 0) {
      setError("Renseignez un libellé et un montant valide.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addCashExpense(sessionId, restaurantId, label.trim(), parsedAmount);
    if (!res.ok) {
      setError(res.error || "Erreur");
      setSaving(false);
      return;
    }
    onSuccess();
  };

  const quickLabels = ["Achat marchandise", "Transport", "Nettoyage", "Divers"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-red-400" />
            Sortie de caisse
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Libellé</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Achat de boissons"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {quickLabels.map((q) => (
                <button key={q} type="button" onClick={() => setLabel(q)} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Montant (FCFA)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 5000"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-red-500 transition"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs">{error}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-lg">
              {saving ? "Enregistrement..." : "Enregistrer la sortie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ClosedSessionCard = memo(function ClosedSessionCard({
  data,
  expanded,
  onToggle,
}: {
  data: SessionWithSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { session, summary } = data;
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [loadedExpenses, setLoadedExpenses] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [loadedOrders, setLoadedOrders] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (expanded && !loadedExpenses) {
      listCashExpenses(session.id).then((list) => {
        setExpenses(list);
        setLoadedExpenses(true);
      });
    }
  }, [expanded, loadedExpenses, session.id]);

  useEffect(() => {
    if (showOrders && !loadedOrders) {
      listSessionOrders(session.id).then((rows) => {
        setOrders(rows.map((r) => mapOrder(r as OrderRow)));
        setLoadedOrders(true);
      });
    }
  }, [showOrders, loadedOrders, session.id]);

  const diff = summary
    ? (summary.closingCashActual ?? 0) - summary.expectedCash
    : 0;

  const openTime = new Date(session.openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const closeTime = session.closedAt
    ? new Date(session.closedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-stone-400" />
            </div>
            <div>
              <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                {openTime} → {closeTime}
              </div>
              <div className="text-[11px] text-stone-400">
                {summary?.ordersCount ?? 0} commande{(summary?.ordersCount ?? 0) > 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-stone-900">{formatFCFA(summary?.totalSales ?? 0)}</div>
              <div className={`text-[11px] font-semibold flex items-center gap-1 justify-end ${
                diff === 0 ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-red-600"
              }`}>
                {diff === 0 ? (
                  <><CheckCircle className="w-3 h-3" /> Parfait</>
                ) : diff > 0 ? (
                  <>+{formatFCFA(diff)} excédent</>
                ) : (
                  <><AlertTriangle className="w-3 h-3" /> {formatFCFA(diff)}</>
                )}
              </div>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
          </div>
        </div>
      </button>

      {expanded && summary && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DetailStat label="Fond initial" value={formatFCFA(summary.openingFloat)} />
            <DetailStat label="Cash" value={formatFCFA(summary.totalCash)} accent="emerald" />
            <DetailStat label="Mobile Money" value={formatFCFA(summary.totalMomo)} accent="blue" />
            <DetailStat label="Total ventes" value={formatFCFA(summary.totalSales)} accent="stone" />
          </div>

          {/* MoMo breakdown */}
          {summary.totalMomo > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider mb-2">Détail Mobile Money</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {summary.momoOrange > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-stone-600"><span className="w-2 h-2 rounded-full bg-orange-500" />Orange Money</span>
                    <span className="text-orange-700 font-bold">{formatFCFA(summary.momoOrange)}</span>
                  </div>
                )}
                {summary.momoWave > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-stone-600"><span className="w-2 h-2 rounded-full bg-blue-500" />Wave</span>
                    <span className="text-blue-700 font-bold">{formatFCFA(summary.momoWave)}</span>
                  </div>
                )}
                {summary.momoMtn > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-stone-600"><span className="w-2 h-2 rounded-full bg-yellow-500" />MTN Money</span>
                    <span className="text-yellow-700 font-bold">{formatFCFA(summary.momoMtn)}</span>
                  </div>
                )}
                {summary.momoMoov > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-stone-600"><span className="w-2 h-2 rounded-full bg-cyan-500" />Moov Money</span>
                    <span className="text-cyan-700 font-bold">{formatFCFA(summary.momoMoov)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(summary.totalExpenses > 0 || expenses.length > 0) && (
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-800 flex items-center gap-1">
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                  Sorties de caisse
                </span>
                <span className="text-sm font-bold text-red-700">-{formatFCFA(summary.totalExpenses)}</span>
              </div>
              {expenses.length > 0 && (
                <div className="space-y-1">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-red-700">{e.label}</span>
                      <span className="text-red-600 font-semibold">-{formatFCFA(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order history */}
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
            <button
              onClick={() => setShowOrders(!showOrders)}
              className="w-full flex items-center justify-between text-xs text-stone-600 hover:text-stone-800 transition"
            >
              <span className="font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {summary.ordersCount} commande{summary.ordersCount > 1 ? "s" : ""} — Voir les reçus
              </span>
              {showOrders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showOrders && (
              <div className="space-y-1.5 mt-3">
                {!loadedOrders ? (
                  <div className="text-center py-3">
                    <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin inline-block" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-2">Aucune commande</p>
                ) : (
                  orders.map((o) => (
                    <OrderHistoryRow key={o.id} order={o} onViewReceipt={() => setReceiptOrder(o)} />
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Solde théorique</span>
              <span className="font-semibold">{formatFCFA(summary.expectedCash)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Espèces comptées</span>
              <span className="font-semibold">{formatFCFA(summary.closingCashActual ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-stone-200 pt-1.5">
              <span className="text-stone-700">Écart</span>
              <span className={diff === 0 ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-red-600"}>
                {diff === 0 ? "0 FCFA" : diff > 0 ? `+${formatFCFA(diff)}` : formatFCFA(diff)}
              </span>
            </div>
          </div>
        </div>
      )}

      {receiptOrder && (
        <ReceiptPrintModal
          order={receiptOrder}
          restaurant={null}
          isOpen
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
});

function MiniStat({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-2.5">
      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">{icon}{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function DetailStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    stone: "text-stone-900",
  };
  return (
    <div className="bg-stone-50 rounded-lg p-2 border border-stone-100">
      <div className="text-[10px] text-stone-500 font-medium">{label}</div>
      <div className={`text-sm font-bold ${accent ? colorMap[accent] ?? "text-stone-900" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}

/* ─── Ligne de commande dans l'historique de caisse ─────────────────── */

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "MoMo",
  card: "Carte",
  room_bill: "Chambre",
  other: "Autre",
};

function OrderHistoryRow({
  order,
  onViewReceipt,
  dark,
}: {
  order: Order;
  onViewReceipt: () => void;
  dark?: boolean;
}) {
  const time = new Date(order.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const location = order.roomLabel
    ? `Ch. ${order.roomLabel}`
    : order.tableNumber
    ? `Table ${order.tableNumber}`
    : "Comptoir";
  const payLabel = PAYMENT_LABELS[order.paymentMethod ?? ""] ?? "—";
  const isPaid = order.paymentStatus === "paid";

  const bg = dark ? "bg-slate-800/40" : "bg-white";
  const textPrimary = dark ? "text-slate-100" : "text-stone-900";
  const textSecondary = dark ? "text-slate-400" : "text-stone-500";
  const btnClass = dark
    ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50"
    : "text-stone-400 hover:text-[#722F37] hover:bg-stone-100";

  return (
    <div className={`flex items-center justify-between ${bg} rounded-lg px-3 py-2`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <div className={`text-xs font-bold ${textPrimary}`}>{time}</div>
          <div className={`text-[10px] ${textSecondary}`}>{location}</div>
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-semibold ${textPrimary} truncate`}>
            {itemCount} article{itemCount > 1 ? "s" : ""} · {formatFCFA(order.total)}
          </div>
          <div className={`text-[10px] ${textSecondary} flex items-center gap-1.5`}>
            <span>{payLabel}</span>
            {isPaid && (
              <span className="text-emerald-500 flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" />
                Payé
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onViewReceipt}
        className={`flex-shrink-0 p-2 rounded-lg transition ${btnClass}`}
        title="Voir le reçu"
      >
        <Printer className="w-4 h-4" />
      </button>
    </div>
  );
}
