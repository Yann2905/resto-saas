import { Timestamp } from "firebase/firestore";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  active: boolean;
  subscriptionExpiresAt: Timestamp | null;
  createdAt: Timestamp;
};

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  available: boolean;
  stockQuantity: number;
  order: number;
};

export type OrderStatus = "pending" | "preparing" | "ready" | "served";

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
};

export type Order = {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};
