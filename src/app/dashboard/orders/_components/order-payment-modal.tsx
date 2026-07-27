"use client";

import { useState } from "react";
import { Order, OrderPaymentMethod } from "@/types";
import { formatFCFA } from "@/lib/format";
import { processOrderPayment } from "@/lib/cash-register";
import { CreditCard, Banknote, Smartphone, CheckCircle, X, AlertCircle } from "lucide-react";

type Props = {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentData: {
    paymentMethod: OrderPaymentMethod;
    amountReceived: number;
    changeGiven: number;
  }) => void;
};

export default function OrderPaymentModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [method, setMethod] = useState<OrderPaymentMethod>("cash");
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>(
    order.total.toString()
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numReceived = parseInt(amountReceivedInput.replace(/\D/g, "") || "0", 10);
  const changeGiven = method === "cash" ? Math.max(0, numReceived - order.total) : 0;
  const isInsufficient = method === "cash" && numReceived < order.total;

  const handleQuickAdd = (add: number) => {
    setAmountReceivedInput((numReceived + add).toString());
  };

  const handleExact = () => {
    setAmountReceivedInput(order.total.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (method === "cash" && isInsufficient) {
      setErrorMsg(`Le montant reçu doit être au moins égal au total (${formatFCFA(order.total)})`);
      return;
    }

    setLoading(true);

    try {
      const res = await processOrderPayment(
        order.id,
        method,
        method === "cash" ? numReceived : order.total
      );

      if (!res.ok) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      onSuccess({
        paymentMethod: method,
        amountReceived: res.data.amountReceived,
        changeGiven: res.data.changeGiven,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue lors de l'encaissement.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Encaissement de la commande
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.tableNumber
                ? `Table N° ${order.tableNumber}`
                : order.roomLabel
                ? `Chambre ${order.roomLabel}`
                : "Commande rapide"}
              {" • "}Réf: #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Montant Total à Payer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total à Encaisser
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              {formatFCFA(order.total)}
            </div>
          </div>

          {/* Choix du mode de règlement */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Mode de Règlement
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  method === "cash"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold shadow-lg shadow-emerald-950/30"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Banknote className="w-6 h-6 mb-1.5" />
                <span className="text-sm">Espèces (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("mobile_money");
                  setAmountReceivedInput(order.total.toString());
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  method === "mobile_money"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold shadow-lg shadow-emerald-950/30"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Smartphone className="w-6 h-6 mb-1.5" />
                <span className="text-sm">Mobile Money</span>
              </button>
            </div>
          </div>

          {/* Formulaire spécifique Espèces */}
          {method === "cash" && (
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Montant reçu du client (FCFA)
                </label>
                <input
                  type="text"
                  value={amountReceivedInput}
                  onChange={(e) => setAmountReceivedInput(e.target.value)}
                  placeholder="ex: 10000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                  autoFocus
                />
              </div>

              {/* Raccourcis d'appoint */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExact}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Appoint exact ({formatFCFA(order.total)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(1000)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  + 1 000 FCFA
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(2000)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  + 2 000 FCFA
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(5000)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  + 5 000 FCFA
                </button>
              </div>

              {/* Calcul automatique de la monnaie à rendre */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Monnaie à rendre :</span>
                <span
                  className={`text-xl font-black ${
                    isInsufficient
                      ? "text-red-400"
                      : changeGiven > 0
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }`}
                >
                  {isInsufficient ? "Montant insuffisant" : formatFCFA(changeGiven)}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (method === "cash" && isInsufficient)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition"
            >
              {loading ? (
                <span>Validation...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Valider l&apos;encaissement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
