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

// ── Payment system ──────────────────────────────────────────────

export type PaymentStatus = "pending" | "success" | "failed";
export type PaymentMethod =
  | "mobile_money"
  | "orange_money"
  | "mtn_money"
  | "wave"
  | "carte_bancaire"
  | "autre";
export type SmsType =
  | "reminder_7d"
  | "reminder_5d"
  | "reminder_0d"
  | "payment_confirmation";

export type PaymentToken = {
  id: string;
  restaurantId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
};

export type Payment = {
  id: string;
  restaurantId: string;
  tokenId: string | null;
  planKey: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  providerRef: string | null;
  paidAt: string | null;
  previousExpiry: string | null;
  newExpiry: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SmsLog = {
  id: string;
  restaurantId: string;
  type: SmsType;
  phone: string;
  payload: string | null;
  sentAt: string;
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

export type PaymentTokenRow = {
  id: string;
  restaurant_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  restaurant_id: string;
  token_id: string | null;
  plan_key: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  provider_ref: string | null;
  paid_at: string | null;
  previous_expiry: string | null;
  new_expiry: string | null;
  created_at: string;
  updated_at: string;
};

export type SmsLogRow = {
  id: string;
  restaurant_id: string;
  type: SmsType;
  phone: string;
  payload: string | null;
  sent_at: string;
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

export function mapPaymentToken(r: PaymentTokenRow): PaymentToken {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    token: r.token,
    expiresAt: r.expires_at,
    used: r.used,
    createdAt: r.created_at,
  };
}

export function mapPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    tokenId: r.token_id,
    planKey: r.plan_key,
    amount: r.amount,
    method: r.method,
    status: r.status,
    reference: r.reference,
    providerRef: r.provider_ref,
    paidAt: r.paid_at,
    previousExpiry: r.previous_expiry,
    newExpiry: r.new_expiry,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
