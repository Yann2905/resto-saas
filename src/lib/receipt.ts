import { Order, Restaurant } from "@/types";
import { formatFCFA } from "./format";

export type ReceiptData = {
  restaurantName: string;
  restaurantAddress?: string | null;
  restaurantPhone?: string | null;
  orderId: string;
  tableNumber: number | null;
  roomLabel: string | null;
  orderType: string;
  orderMode: string;
  deliveryQuartier: string | null;
  deliveryCarrefour: string | null;
  deliveryPhone: string | null;
  deliveryFee: number;
  dateStr: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  total: number;
  paymentMethodLabel: string;
  amountReceived: number | null;
  changeGiven: number | null;
  cashAmount: number | null;
  momoAmount: number | null;
  paidAtStr: string | null;
};

export function generateReceiptData(
  order: Order,
  restaurant?: Restaurant | null
): ReceiptData {
  const dateObj = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
  const dateStr = dateObj.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let paymentMethodLabel = "Non spécifié";
  if (order.paymentMethod === "cash") paymentMethodLabel = "Espèces";
  else if (order.paymentMethod === "mobile_money") paymentMethodLabel = "Mobile Money";
  else if (order.paymentMethod === "card") paymentMethodLabel = "Carte Bancaire";
  else if (order.paymentMethod === "room_bill") paymentMethodLabel = "Note de Chambre";
  else if (order.paymentMethod === "other") paymentMethodLabel = "Autre";
  else if (order.paymentMethod === "mixed") paymentMethodLabel = "Mixte (Cash + MoMo)";

  return {
    restaurantName: restaurant?.name || "Resto SaaS",
    restaurantAddress: restaurant?.address || null,
    restaurantPhone: restaurant?.phone || null,
    orderId: order.id.slice(0, 8).toUpperCase(),
    tableNumber: order.tableNumber,
    roomLabel: order.roomLabel,
    orderType: order.orderType,
    orderMode: order.orderMode ?? "dine_in",
    deliveryQuartier: order.deliveryQuartier ?? null,
    deliveryCarrefour: order.deliveryCarrefour ?? null,
    deliveryPhone: order.deliveryPhone ?? null,
    deliveryFee: order.deliveryFee ?? 0,
    dateStr,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.total || i.price * i.quantity,
    })),
    subtotal: order.total,
    total: order.total,
    paymentMethodLabel,
    amountReceived: order.amountReceived,
    changeGiven: order.changeGiven,
    cashAmount: order.cashAmount ?? null,
    momoAmount: order.momoAmount ?? null,
    paidAtStr: order.paidAt
      ? new Date(order.paidAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
  };
}
