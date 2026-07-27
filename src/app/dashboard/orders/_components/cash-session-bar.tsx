"use client";

import { useEffect, useState, useCallback } from "react";
import { CashSession, CashSessionSummary } from "@/types";
import {
  getActiveCashSession,
  openCashSession,
  closeCashSession,
  getCashSessionSummary,
} from "@/lib/cash-register";
import { formatFCFA } from "@/lib/format";
import {
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  Smartphone,
  Banknote,
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
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-wrap items-center justify-between gap-4">
        {session ? (
          /* Session Ouverte */
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-emerald-400">
              <Unlock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Caisse Ouverte</span>
            </div>

            <div className="flex items-center gap-6 text-xs font-medium border-l border-slate-800 pl-6">
              <div>
                <span className="text-slate-400 block">Fond initial</span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatFCFA(summary?.openingFloat || 0)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  Ventes Cash
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatFCFA(summary?.totalCash || 0)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  Ventes MoMo
                </span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatFCFA(summary?.totalMomo || 0)}
                </span>
              </div>

              <div className="border-l border-slate-800 pl-6">
                <span className="text-slate-400 block">Solde Théorique Caisse</span>
                <span className="text-base font-extrabold text-amber-400">
                  {formatFCFA(summary?.expectedCash || 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Aucune session ouverte */
          <div className="flex items-center gap-3 text-slate-400">
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 text-xs font-semibold">
              <Lock className="w-4 h-4" />
              <span>Caisse non ouverte</span>
            </div>
            <p className="text-xs">
              Ouvrez la caisse pour enregistrer le fond initial et suivre les espèces.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={loadSession}
            title="Rafraîchir"
            className="p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {session ? (
            <button
              onClick={() => {
                setClosingCashInput((summary?.expectedCash || 0).toString());
                setShowCloseModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-800/60 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Clôturer la Caisse (Z)</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Ouvrir la Caisse</span>
            </button>
          )}
        </div>
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
    </>
  );
}
