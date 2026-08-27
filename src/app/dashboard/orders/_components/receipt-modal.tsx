"use client";

import { Order, Restaurant } from "@/types";
import { generateReceiptData } from "@/lib/receipt";
import { formatFCFA } from "@/lib/format";
import { Printer, X, Check } from "lucide-react";

type Props = {
  order: Order;
  restaurant?: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ReceiptPrintModal({
  order,
  restaurant,
  isOpen,
  onClose,
}: Props) {
  if (!isOpen) return null;

  const data = generateReceiptData(order, restaurant);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header (Masqué à l'impression) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 print:hidden">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            Aperçu & Impression du Reçu
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reçu Ticket 80mm Printable */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/30">
          <div
            id="printable-receipt"
            className="bg-white text-black p-6 rounded-lg shadow-inner font-mono text-xs max-w-[300px] mx-auto space-y-4 print:w-full print:max-w-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header du Ticket */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
              <h2 className="font-bold text-base uppercase tracking-wider">
                {data.restaurantName}
              </h2>
              {data.restaurantAddress && <p>{data.restaurantAddress}</p>}
              {data.restaurantPhone && <p>Tél: {data.restaurantPhone}</p>}
            </div>

            {/* Métadonnées Commande */}
            <div className="space-y-1 pb-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Réf :</span>
                <span className="font-bold">#{data.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Date :</span>
                <span>{data.dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Emplacement :</span>
                <span className="font-bold">
                  {data.tableNumber
                    ? `Table N° ${data.tableNumber}`
                    : data.roomLabel
                    ? `Chambre ${data.roomLabel}`
                    : "Comptoir"}
                </span>
              </div>
            </div>

            {/* Articles */}
            <div className="space-y-2 pb-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold border-b border-gray-200 pb-1">
                <span>Article</span>
                <span>Total</span>
              </div>
              {data.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <span className="max-w-[180px] break-words">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold">{formatFCFA(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Totaux & Mode de Paiement */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL :</span>
                <span>{formatFCFA(data.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Règlement :</span>
                <span className="font-semibold">{data.paymentMethodLabel}</span>
              </div>
              {/* Détail paiement mixte */}
              {data.cashAmount !== null && data.cashAmount > 0 && data.momoAmount !== null && data.momoAmount > 0 && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>Part Espèces :</span>
                    <span>{formatFCFA(data.cashAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Part MoMo :</span>
                    <span>{formatFCFA(data.momoAmount)}</span>
                  </div>
                </>
              )}
              {data.amountReceived !== null && data.amountReceived > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Montant Reçu :</span>
                  <span>{formatFCFA(data.amountReceived)}</span>
                </div>
              )}
              {data.changeGiven !== null && data.changeGiven > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Monnaie Rendue :</span>
                  <span>{formatFCFA(data.changeGiven)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-500 pt-1 space-y-0.5">
              <p>Merci pour votre visite !</p>
              <p>À bientôt chez {data.restaurantName}</p>
            </div>
          </div>
        </div>

        {/* Actions (Masqué à l'impression) */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le reçu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
