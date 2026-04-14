import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Restaurant, Category, Product } from "@/types";

export async function getRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  const q = query(
    collection(db, "restaurants"),
    where("slug", "==", slug),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Restaurant, "id">) };
}

export async function getRestaurantById(
  id: string
): Promise<Restaurant | null> {
  const d = await getDoc(doc(db, "restaurants", id));
  if (!d.exists()) return null;
  return { id: d.id, ...(d.data() as Omit<Restaurant, "id">) };
}

export async function getCategories(restaurantId: string): Promise<Category[]> {
  const snap = await getDocs(
    collection(db, "restaurants", restaurantId, "categories")
  );
  const cats = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Category, "id">),
  }));
  return cats.sort((a, b) => a.order - b.order);
}

export async function getProducts(restaurantId: string): Promise<Product[]> {
  const snap = await getDocs(
    collection(db, "restaurants", restaurantId, "products")
  );
  const products = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Product, "id">),
  }));
  return products.sort((a, b) => a.order - b.order);
}

export function isSubscriptionActive(r: Restaurant): boolean {
  if (!r.active) return false;
  if (!r.subscriptionExpiresAt) return true;
  return r.subscriptionExpiresAt.toMillis() > Date.now();
}
