export type DaySchedule = {
  open: string;  // "HH:mm"
  close: string; // "HH:mm"
  closed: boolean;
};

export type WeekKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type OpeningHours = Record<WeekKey, DaySchedule>;

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  active: boolean;
  subscriptionExpiresAt: string | null; // ISO
  openingHours: OpeningHours | null;
  createdAt: string; // ISO
};

export type Category = {
  id: string;
  restaurantId: string;
  name: string;
  parentId: string | null;
  order: number;
};

export type Product = {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
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
  restaurantId: string;
  tableNumber: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

// Raw DB rows (snake_case from Postgres)
export type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  active: boolean;
  subscription_expires_at: string | null;
  opening_hours: OpeningHours | null;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  parent_id: string | null;
  order: number;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string;
  available: boolean;
  stock_quantity: number;
  order: number;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  restaurant_id: string;
  table_number: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

// Mappers snake_case -> camelCase
export function mapRestaurant(r: RestaurantRow): Restaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    address: r.address,
    phone: r.phone,
    logoUrl: r.logo_url,
    active: r.active,
    subscriptionExpiresAt: r.subscription_expires_at,
    openingHours: r.opening_hours,
    createdAt: r.created_at,
  };
}

export function mapCategory(c: CategoryRow): Category {
  return {
    id: c.id,
    restaurantId: c.restaurant_id,
    name: c.name,
    parentId: c.parent_id,
    order: c.order,
  };
}

export function mapProduct(p: ProductRow): Product {
  return {
    id: p.id,
    restaurantId: p.restaurant_id,
    name: p.name,
    price: p.price,
    imageUrl: p.image_url,
    categoryId: p.category_id,
    available: p.available,
    stockQuantity: p.stock_quantity,
    order: p.order,
  };
}

export function mapOrder(o: OrderRow): Order {
  return {
    id: o.id,
    restaurantId: o.restaurant_id,
    tableNumber: o.table_number,
    items: o.items,
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}
