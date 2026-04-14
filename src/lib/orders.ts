import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { CartItem, OrderItem, Product } from "@/types";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createOrder(
  restaurantId: string,
  tableNumber: number,
  items: CartItem[]
): Promise<CreateOrderResult> {
  if (items.length === 0) return { ok: false, error: "Panier vide" };

  try {
    const orderRef = doc(collection(db, "restaurants", restaurantId, "orders"));

    const result = await runTransaction(db, async (tx) => {
      const productRefs = items.map((i) =>
        doc(db, "restaurants", restaurantId, "products", i.productId)
      );
      const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));

      const orderItems: OrderItem[] = [];
      let total = 0;

      for (let i = 0; i < items.length; i++) {
        const snap = productSnaps[i];
        if (!snap.exists()) throw new Error(`Produit introuvable: ${items[i].name}`);
        const p = snap.data() as Product;
        if (!p.available) throw new Error(`Indisponible: ${p.name}`);
        if (p.stockQuantity < items[i].quantity) {
          throw new Error(
            `Stock insuffisant pour ${p.name} (reste ${p.stockQuantity})`
          );
        }
        const lineTotal = p.price * items[i].quantity;
        total += lineTotal;
        orderItems.push({
          productId: items[i].productId,
          name: p.name,
          price: p.price,
          quantity: items[i].quantity,
          total: lineTotal,
        });
      }

      for (let i = 0; i < items.length; i++) {
        const snap = productSnaps[i];
        const p = snap.data() as Product;
        const newStock = p.stockQuantity - items[i].quantity;
        tx.update(productRefs[i], {
          stockQuantity: newStock,
          available: newStock > 0 ? p.available : false,
        });
      }

      tx.set(orderRef, {
        tableNumber,
        items: orderItems,
        total,
        status: "pending",
        createdAt: serverTimestamp() as unknown as Timestamp,
        updatedAt: serverTimestamp() as unknown as Timestamp,
      });

      return orderRef.id;
    });

    return { ok: true, orderId: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
