"use client";

import { useState } from "react";
import { Order, OrderPaymentMethod, MobileMoneyProvider } from "@/types";
import { formatFCFA } from "@/lib/format";
import { processOrderPayment } from "@/lib/cash-register";
import { CreditCard, Banknote, Smartphone, CheckCircle, X, AlertCircle, Split } from "lucide-react";

const MOMO_PROVIDERS: { value: MobileMoneyProvider; label: string; color: string }[] = [
  { value: "orange_money", label: "Orange Money", color: "bg-orange-500" },
  { value: "wave", label: "Wave", color: "bg-blue-500" },
  { value: "mtn_money", label: "MTN Money", color: "bg-yellow-500" },
  { value: "moov_money", label: "Moov Money", color: "bg-cyan-500" },
];

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
  const [provider, setProvider] = useState<MobileMoneyProvider>("orange_money");
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>(
    order.total.toString()
  );
  // Split payment state
  const [cashPartInput, setCashPartInput] = useState<string>("");
  const [momoPartInput, setMomoPartInput] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numReceived = parseInt(amountReceivedInput.replace(/\D/g, "") || "0", 10);
  const changeGiven = method === "cash" ? Math.max(0, numReceived - order.total) : 0;
  const isInsufficient = method === "cash" && numReceived < order.total;

  // Mixed payment calculations
  const cashPart = parseInt(cashPartInput.replace(/\D/g, "") || "0", 10);
  const momoPart = parseInt(momoPartInput.replace(/\D/g, "") || "0", 10);
  const mixedTotal = cashPart + momoPart;
  const mixedInsufficient = method === "mixed" && mixedTotal < order.total;
  const mixedOverpay = method === "mixed" && mixedTotal > order.total;

  // For mixed: cash received from client (can be >= cashPart)
  const mixedCashReceived = parseInt(amountReceivedInput.replace(/\D/g, "") || "0", 10);
  const mixedChange = method === "mixed" ? Math.max(0, mixedCashReceived - cashPart) : 0;
  const mixedCashInsufficient = method === "mixed" && mixedCashReceived < cashPart;

  const handleQuickAdd = (add: number) => {
    setAmountReceivedInput((numReceived + add).toString());
  };

  const handleExact = () => {
    setAmountReceivedInput(order.total.toString());
  };

  const handleSetCashPart = (val: string) => {
    setCashPartInput(val);
    const c = parseInt(val.replace(/\D/g, "") || "0", 10);
    const remaining = Math.max(0, order.total - c);
    setMomoPartInput(remaining.toString());
    // Pre-fill cash received with the cash part
    setAmountReceivedInput(c.toString());
  };

  const handleSetMomoPart = (val: string) => {
    setMomoPartInput(val);
    const m = parseInt(val.replace(/\D/g, "") || "0", 10);
    const remaining = Math.max(0, order.total - m);
    setCashPartInput(remaining.toString());
    setAmountReceivedInput(remaining.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (method === "cash" && isInsufficient) {
      setErrorMsg(`Le montant reçu doit être au moins égal au total (${formatFCFA(order.total)})`);
      return;
    }

    if (method === "mixed") {
      if (mixedInsufficient) {
        setErrorMsg(`La somme Cash (${formatFCFA(cashPart)}) + MoMo (${formatFCFA(momoPart)}) est inférieure au total (${formatFCFA(order.total)})`);
        return;
      }
      if (mixedOverpay) {
        setErrorMsg(`La somme Cash + MoMo dépasse le total de ${formatFCFA(mixedTotal - order.total)}`);
        return;
      }
      if (mixedCashInsufficient) {
        setErrorMsg(`Le montant reçu en espèces doit couvrir au moins la part cash (${formatFCFA(cashPart)})`);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await processOrderPayment(
        order.id,
        method,
        method === "cash"
          ? numReceived
          : method === "mixed"
          ? mixedCashReceived
          : order.total,
        method === "mobile_money" || method === "mixed" ? provider : undefined,
        method === "mixed" ? cashPart : undefined,
        method === "mixed" ? momoPart : undefined
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

  const canSubmit =
    method === "cash"
      ? !isInsufficient
      : method === "mixed"
      ? !mixedInsufficient && !mixedOverpay && !mixedCashInsufficient && cashPart > 0 && momoPart > 0
      : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[95vh] text-slate-100">
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
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMethod("cash");
                  setAmountReceivedInput(order.total.toString());
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  method === "cash"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold shadow-lg shadow-emerald-950/30"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Banknote className="w-6 h-6 mb-1" />
                <span className="text-xs">Espèces</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("mobile_money");
                  setAmountReceivedInput(order.total.toString());
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  method === "mobile_money"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold shadow-lg shadow-emerald-950/30"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Smartphone className="w-6 h-6 mb-1" />
                <span className="text-xs">Mobile Money</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("mixed");
                  setCashPartInput("");
                  setMomoPartInput("");
                  setAmountReceivedInput("0");
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  method === "mixed"
                    ? "bg-amber-500/10 border-amber-500 text-amber-400 font-semibold shadow-lg shadow-amber-950/30"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Split className="w-6 h-6 mb-1" />
                <span className="text-xs">Mixte</span>
              </button>
            </div>
          </div>

          {/* Mobile Money provider selector — for mobile_money and mixed */}
          {(method === "mobile_money" || method === "mixed") && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Opérateur Mobile Money
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOMO_PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border transition-all text-left ${
                      provider === p.value
                        ? "bg-blue-500/10 border-blue-500 text-blue-300 font-semibold"
                        : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${p.color}`} />
                    <span className="text-sm">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Paiement Mixte ── */}
          {method === "mixed" && (
            <div className="space-y-4 bg-amber-950/20 p-4 rounded-xl border border-amber-800/40">
              <p className="text-xs text-amber-300/80 font-medium">
                Répartir le montant entre Espèces et Mobile Money
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    Part Espèces
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cashPartInput}
                    onChange={(e) => handleSetCashPart(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    Part MoMo
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={momoPartInput}
                    onChange={(e) => handleSetMomoPart(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Quick split buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const half = Math.floor(order.total / 2);
                    handleSetCashPart(half.toString());
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  50/50
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCashPart(Math.floor(order.total * 0.25).toString())}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  ¼ Cash
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCashPart(Math.floor(order.total * 0.75).toString())}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  ¾ Cash
                </button>
              </div>

              {/* Sum validation */}
              <div className="pt-2 border-t border-amber-800/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Somme :</span>
                  <span className={`font-bold ${
                    mixedTotal === order.total
                      ? "text-emerald-400"
                      : mixedInsufficient
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}>
                    {formatFCFA(mixedTotal)} / {formatFCFA(order.total)}
                    {mixedTotal === order.total && " ✓"}
                    {mixedInsufficient && " — Insuffisant"}
                    {mixedOverpay && " — Dépasse le total"}
                  </span>
                </div>
              </div>

              {/* Cash received for change calculation */}
              {cashPart > 0 && mixedTotal === order.total && (
                <div className="space-y-2 pt-2 border-t border-amber-800/30">
                  <label className="text-xs font-medium text-slate-300">
                    Montant espèces reçu du client (pour la monnaie)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    placeholder={cashPart.toString()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-base font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Monnaie à rendre :</span>
                    <span className={`text-lg font-black ${
                      mixedCashInsufficient
                        ? "text-red-400"
                        : mixedChange > 0
                        ? "text-emerald-400"
                        : "text-slate-300"
                    }`}>
                      {mixedCashInsufficient
                        ? "Insuffisant"
                        : formatFCFA(mixedChange)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
              disabled={loading || !canSubmit}
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
