"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CashSession, CashSessionSummary, CashExpense } from "@/types";
import {
  getActiveCashSession,
  openCashSession,
  closeCashSession,
  getCashSessionSummary,
  addCashExpense,
} from "@/lib/cash-register";
import { formatFCFA } from "@/lib/format";
import {
  ArrowDownCircle,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  Smartphone,
  Banknote,
  History,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type Props = {
  restaurantId: string;
};

export default function CashSessionBar({ restaurantId }: Props) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  // Form states
  const [openingFloatInput, setOpeningFloatInput] = useState("25000");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const active = await getActiveCashSession(restaurantId);
      setSession(active);
      if (active) {
        const sum = await getCashSessionSummary(active.id);
        setSummary(sum);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error("Erreur chargement caisse", err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);

    const val = parseInt(openingFloatInput.replace(/\D/g, "") || "0", 10);
    const res = await openCashSession(restaurantId, val);

    if (!res.ok) {
      setErrorMsg(res.error || "Erreur lors de l'ouverture.");
      setActionLoading(false);
      return;
    }

    setShowOpenModal(false);
    setActionLoading(false);
    loadSession();
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setActionLoading(true);
    setErrorMsg(null);

    const val = parseInt(closingCashInput.replace(/\D/g, "") || "0", 10);
    const res = await closeCashSession(session.id, val);

    if (!res.ok) {
      setErrorMsg(res.error || "Erreur lors de la clôture.");
      setActionLoading(false);
      return;
    }

    setShowCloseModal(false);
    setActionLoading(false);
    loadSession();
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between animate-pulse">
        <div className="h-5 w-48 bg-slate-800 rounded"></div>
        <div className="h-8 w-24 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl text-slate-100">
        {session ? (
          /* Session Ouverte */
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-emerald-400">
                <Unlock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Caisse Ouverte</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSession}
                  title="Rafraîchir"
                  className="p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Link
                  href="/dashboard/caisse"
                  className="p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
                  title="Historique"
                >
                  <History className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium">
              <div className="bg-slate-800/50 rounded-xl p-2.5">
                <span className="text-slate-400 block mb-0.5">Fond initial</span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatFCFA(summary?.openingFloat || 0)}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-2.5">
                <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  Ventes Cash
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatFCFA(summary?.totalCash || 0)}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-2.5">
                <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  Ventes MoMo
                </span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatFCFA(summary?.totalMomo || 0)}
                </span>
                {summary && summary.totalMomo > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {summary.momoOrange > 0 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Orange</span>
                        <span className="text-orange-400 font-medium">{formatFCFA(summary.momoOrange)}</span>
                      </div>
                    )}
                    {summary.momoWave > 0 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Wave</span>
                        <span className="text-blue-300 font-medium">{formatFCFA(summary.momoWave)}</span>
                      </div>
                    )}
                    {summary.momoMtn > 0 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />MTN</span>
                        <span className="text-yellow-400 font-medium">{formatFCFA(summary.momoMtn)}</span>
                      </div>
                    )}
                    {summary.momoMoov > 0 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />Moov</span>
                        <span className="text-cyan-400 font-medium">{formatFCFA(summary.momoMoov)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {(summary?.totalExpenses ?? 0) > 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-2.5">
                  <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-red-400" />
                    Sorties
                  </span>
                  <span className="text-sm font-semibold text-red-400">
                    -{formatFCFA(summary?.totalExpenses || 0)}
                  </span>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-2.5">
                  <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-slate-500" />
                    Sorties
                  </span>
                  <span className="text-sm font-semibold text-slate-500">0 FCFA</span>
                </div>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-amber-300/80 font-medium">Solde Théorique Caisse</span>
              <span className="text-lg font-extrabold text-amber-400">
                {formatFCFA(summary?.expectedCash || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                Sortie
              </button>
              <button
                onClick={() => {
                  setClosingCashInput((summary?.expectedCash || 0).toString());
                  setShowCloseModal(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-800/60 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                Clôturer (Z)
              </button>
            </div>
          </div>
        ) : (
          /* Aucune session ouverte */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400 text-xs font-semibold">
                <Lock className="w-4 h-4" />
                <span>Caisse fermée</span>
              </div>
              <p className="text-xs hidden sm:block">
                Ouvrez la caisse pour suivre les espèces.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={loadSession}
                title="Rafraîchir"
                className="p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                href="/dashboard/caisse"
                className="p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
                title="Historique"
              >
                <History className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setShowOpenModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
              >
                <Unlock className="w-3.5 h-3.5" />
                Ouvrir la Caisse
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ouverture */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                Ouverture de Session de Caisse
              </h3>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenSession} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Fond de caisse initial (FCFA)
                </label>
                <input
                  type="text"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(e.target.value)}
                  placeholder="ex: 25000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  Saisissez le montant en espèces disponible dans le tiroir au démarrage du service.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-950/40"
                >
                  {actionLoading ? "Ouverture..." : "Ouvrir la caisse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Clôture */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                Clôture de Caisse (Rapport Z)
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseSession} className="p-6 space-y-5">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Solde Théorique attendu :</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {formatFCFA(summary?.expectedCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>(Fond initial + Ventes Cash)</span>
                  <span>
                    ({formatFCFA(summary?.openingFloat || 0)} + {formatFCFA(summary?.totalCash || 0)})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Espèces physiques comptées (FCFA)
                </label>
                <input
                  type="text"
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  placeholder="ex: 85000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-amber-500 transition"
                  autoFocus
                />
              </div>

              {/* Écart de caisse dynamique */}
              {closingCashInput !== "" && (
                <div className="p-3 rounded-xl border bg-slate-950/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Écart de caisse :</span>
                  {(() => {
                    const actual = parseInt(closingCashInput.replace(/\D/g, "") || "0", 10);
                    const diff = actual - (summary?.expectedCash || 0);
                    if (diff === 0) {
                      return (
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Parfait (0 FCFA)
                        </span>
                      );
                    } else if (diff > 0) {
                      return (
                        <span className="font-bold text-blue-400">
                          + {formatFCFA(diff)} (Excédent)
                        </span>
                      );
                    } else {
                      return (
                        <span className="font-bold text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {formatFCFA(diff)} (Manquant)
                        </span>
                      );
                    }
                  })()}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition shadow-lg shadow-amber-950/40"
                >
                  {actionLoading ? "Clôture..." : "Confirmer la clôture Z"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sortie de caisse */}
      {showExpenseModal && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-red-400" />
                Sortie de caisse
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const val = parseInt(expenseAmount.replace(/\D/g, "") || "0", 10);
                if (!expenseLabel.trim() || val <= 0) { setErrorMsg("Renseignez un libellé et un montant."); return; }
                setActionLoading(true);
                setErrorMsg(null);
                const res = await addCashExpense(session.id, restaurantId, expenseLabel.trim(), val);
                if (!res.ok) { setErrorMsg(res.error || "Erreur"); setActionLoading(false); return; }
                setShowExpenseModal(false);
                setExpenseLabel("");
                setExpenseAmount("");
                setActionLoading(false);
                loadSession();
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Libellé</label>
                <input type="text" value={expenseLabel} onChange={(e) => setExpenseLabel(e.target.value)} placeholder="Ex: Achat de boissons" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition" autoFocus />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Achat marchandise", "Transport", "Nettoyage", "Divers"].map((q) => (
                    <button key={q} type="button" onClick={() => setExpenseLabel(q)} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition">{q}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Montant (FCFA)</label>
                <input type="text" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="Ex: 5000" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-red-500 transition" />
              </div>
              {errorMsg && <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs">{errorMsg}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition">Annuler</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-lg">{actionLoading ? "..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
