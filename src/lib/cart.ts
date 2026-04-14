"use client";

import { CartItem } from "@/types";

const keyFor = (restaurantId: string, table: string) =>
  `cart:${restaurantId}:${table}`;

export function getCart(restaurantId: string, table: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(restaurantId, table));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(
  restaurantId: string,
  table: string,
  items: CartItem[]
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(restaurantId, table), JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}

export function addToCart(
  restaurantId: string,
  table: string,
  item: Omit<CartItem, "quantity">
) {
  const cart = getCart(restaurantId, table);
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(restaurantId, table, cart);
}

export function updateQuantity(
  restaurantId: string,
  table: string,
  productId: string,
  quantity: number
) {
  const cart = getCart(restaurantId, table);
  const next =
    quantity <= 0
      ? cart.filter((c) => c.productId !== productId)
      : cart.map((c) => (c.productId === productId ? { ...c, quantity } : c));
  saveCart(restaurantId, table, next);
}

export function clearCart(restaurantId: string, table: string) {
  saveCart(restaurantId, table, []);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
