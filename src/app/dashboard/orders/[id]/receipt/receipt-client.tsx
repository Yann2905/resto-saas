"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Order, Restaurant, OrderStatus } from "@/types";
import { formatFCFA } from "@/lib/format";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "EN ATTENTE",
  preparing: "EN PRÉPARATION",
  ready: "PRÊT",
  served: "SERVI",
};

export default function ReceiptClient({
  order,
  restaurant,
  autoPrint,
}: {
  order: Order;
  restaurant: Restaurant;
  autoPrint: boolean;
}) {
  useEffect(() => {
    if (autoPrint) {
      // léger délai pour laisser la page peindre
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  const created = new Date(order.createdAt);
  const receiptNo = order.id.slice(0, 8).toUpperCase();
  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="min-h-screen bg-stone-100 flex justify-center py-8 px-4 print:bg-white print:py-0">
      {/* Toolbar (cachée à l'impression) */}
      <div className="fixed top-4 right-4 flex gap-2 z-10 print:hidden">
        <Link
          href="/dashboard/orders"
          className="rounded-full bg-white border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
        >
          ← Retour
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-stone-900 text-white px-5 py-2 text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm flex items-center gap-1.5"
        >
          🖨 Imprimer
        </button>
      </div>

      {/* Ticket — format 80mm */}
      <article
        id="receipt"
        className="bg-white w-[80mm] min-h-[200px] px-4 py-5 shadow-md print:shadow-none print:w-[80mm] font-mono text-[12px] leading-snug text-stone-900"
      >
        {/* Header */}
        <header className="text-center mb-3">
          {restaurant.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="mx-auto mb-2 max-w-[120px] max-h-[60px] object-contain"
            />
          )}
          <h1 className="text-base font-bold tracking-tight uppercase">
            {restaurant.name}
          </h1>
          {restaurant.address && (
            <p className="text-[11px] text-stone-600 mt-0.5">
              {restaurant.address}
            </p>
          )}
          {restaurant.phone && (
            <p className="text-[11px] text-stone-600">Tél : {restaurant.phone}</p>
          )}
        </header>

        <Divider />

        {/* Meta */}
        <div className="space-y-0.5 mb-1">
          <Row label="Reçu N°" value={`#${receiptNo}`} bold />
          <Row label="Date" value={fmtDate(created)} />
          <Row label="Heure" value={fmtTime(created)} />
          <Row label="Table" value={String(order.tableNumber)} />
          <Row label="Statut" value={STATUS_LABELS[order.status]} />
        </div>

        <Divider />

        {/* Items */}
        <div className="space-y-2 my-2">
          {order.items.map((it) => (
            <div key={it.productId}>
              <div className="flex justify-between gap-2">
                <span className="flex-1 truncate uppercase">{it.name}</span>
                <span className="tabular-nums">{formatFCFA(it.total)}</span>
              </div>
              <div className="text-[11px] text-stone-600 flex justify-between">
                <span>
                  {it.quantity} x {formatFCFA(it.price)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Totals */}
        <div className="space-y-0.5 my-1">
          <Row
            label={`Articles (${itemsCount})`}
            value={formatFCFA(order.total)}
          />
          <div className="flex justify-between gap-2 font-bold text-[14px] mt-1.5 pt-1.5 border-t border-stone-900">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatFCFA(order.total)}</span>
          </div>
          <p className="text-[10px] text-stone-500 text-center mt-1">
            TVA incluse
          </p>
        </div>

        <Divider />

        {/* Footer */}
        <footer className="text-center text-[11px] mt-3 space-y-0.5">
          <p className="font-bold">MERCI DE VOTRE VISITE</p>
          <p className="text-stone-600">À bientôt chez {restaurant.name} !</p>
          <p className="text-stone-400 mt-2 text-[10px]">
            resto-saas · /{restaurant.slug}
          </p>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #receipt,
          #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}
    >
      <span className="text-stone-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="text-center text-stone-400 select-none -my-0.5">
      ······································
    </div>
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
