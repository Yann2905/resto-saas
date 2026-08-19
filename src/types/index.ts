export type DaySchedule = {
  open: string;  // "HH:mm"
  close: string; // "HH:mm"
  closed: boolean;
};

export type WeekKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type OpeningHours = Record<WeekKey, DaySchedule>;

export type RestaurantType = "restaurant" | "hotel" | "both";

export function isHotelType(type: RestaurantType | undefined): boolean {
  return type === "hotel" || type === "both";
}
export type OrderType = "food" | "service" | "issue";

export type HotelService = {
  id: string;
  label: string;
};

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
  lowStockThreshold: number;
  plan: "starter" | "pro" | "business";
  planExpiresAt: string | null;
  featureOverrides: Record<string, unknown>;
  isPartner: boolean;
  type: RestaurantType;
  hotelRooms: string[];
  hotelServices: HotelService[];
  hotelIssues: HotelService[];
  deliveryEnabled: boolean;
  deliveryFee: number;
  estimatedDeliveryMinutes: number;
  avgRating: number;
  reviewCount: number;
};

export type Category = {
  id: string;
  restaurantId: string;
  name: string;
  parentId: string | null;
  order: number;
  stock: number | null;
  visibleToClient: boolean;
};

export type Product = {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  categoryId: string;
  available: boolean;
  stockQuantity: number | null;
  stockConsumption: number;
  order: number;
  description: string | null;
  isDaily: boolean;
  categoryLinks?: ProductCategoryLink[];
};

export type ProductCategoryLink = {
  id?: string;
  productId: string;
  categoryId: string;
  quantityPerUnit: number;
};

export type ProductCategoryLinkRow = {
  id: string;
  product_id: string;
  category_id: string;
  quantity_per_unit: number;
};

export type UserRole = "owner" | "superadmin" | "waiter";

export type OrderMode = "dine_in" | "delivery";

export type OrderStatus = "pending" | "preparing" | "ready" | "served";

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  imageUrl?: string | null;
};

export type OrderPaymentStatus = "unpaid" | "paid";
export type OrderPaymentMethod = "cash" | "mobile_money" | "card" | "room_bill" | "other";
export type MobileMoneyProvider = "orange_money" | "wave" | "mtn_money" | "moov_money";

export type Order = {
  id: string;
  restaurantId: string;
  tableNumber: number | null;
  roomLabel: string | null;
  orderType: OrderType;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: OrderPaymentMethod | null;
  paymentProvider: MobileMoneyProvider | null;
  paidAt: string | null;
  amountReceived: number | null;
  changeGiven: number | null;
  cashSessionId: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  acknowledgedAt: string | null;
  orderMode: OrderMode;
  deliveryQuartier: string | null;
  deliveryCarrefour: string | null;
  deliveryPhone: string | null;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
};

export type StaffMember = {
  id: string;
  email: string;
  displayName: string;
  assignedTables: number[];
  assignedRooms: string[];
  createdAt: string;
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
  low_stock_threshold: number;
  plan?: string;
  plan_expires_at?: string | null;
  feature_overrides?: Record<string, unknown>;
  is_partner?: boolean;
  type?: string;
  hotel_rooms?: string[];
  hotel_services?: HotelService[];
  hotel_issues?: HotelService[];
  delivery_enabled?: boolean;
  delivery_fee?: number;
  estimated_delivery_minutes?: number;
  avg_rating?: number;
  review_count?: number;
};

export type CategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  parent_id: string | null;
  order: number;
  stock: number | null;
  visible_to_client?: boolean;
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
  stock_quantity: number | null;
  stock_consumption: number;
  order: number;
  description: string | null;
  is_daily?: boolean;
  created_at: string;
  updated_at: string;
  product_category_links?: ProductCategoryLinkRow[];
};

export type OrderRow = {
  id: string;
  restaurant_id: string;
  table_number: number | null;
  room_label: string | null;
  order_type: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_status?: OrderPaymentStatus;
  payment_method?: OrderPaymentMethod | null;
  payment_provider?: MobileMoneyProvider | null;
  paid_at?: string | null;
  amount_received?: number | null;
  change_given?: number | null;
  cash_session_id?: string | null;
  assigned_to: string | null;
  acknowledged_at: string | null;
  order_mode: string;
  delivery_quartier: string | null;
  delivery_carrefour: string | null;
  delivery_phone: string | null;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
};

export type CashSessionStatus = "open" | "closed";

export type CashSession = {
  id: string;
  restaurantId: string;
  openedBy: string | null;
  closedBy: string | null;
  openingFloat: number;
  closingCashActual: number | null;
  closingCashExpected: number | null;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashSessionRow = {
  id: string;
  restaurant_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opening_float: number;
  closing_cash_actual: number | null;
  closing_cash_expected: number | null;
  status: CashSessionStatus;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CashSessionSummary = {
  sessionId: string;
  restaurantId: string;
  status: CashSessionStatus;
  openingFloat: number;
  openedAt: string;
  closedAt: string | null;
  totalCash: number;
  totalMomo: number;
  momoOrange: number;
  momoWave: number;
  momoMtn: number;
  momoMoov: number;
  totalCard: number;
  totalOther: number;
  totalSales: number;
  ordersCount: number;
  totalExpenses: number;
  expectedCash: number;
  closingCashActual: number | null;
  closingCashExpected: number | null;
};

export type CashExpense = {
  id: string;
  cashSessionId: string;
  restaurantId: string;
  label: string;
  amount: number;
  createdBy: string | null;
  createdAt: string;
};

export type CashExpenseRow = {
  id: string;
  cash_session_id: string;
  restaurant_id: string;
  label: string;
  amount: number;
  created_by: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  restaurantId: string;
  orderId: string | null;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ReviewRow = {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
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
  needs_review: boolean;
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
    lowStockThreshold: r.low_stock_threshold ?? 10,
    plan: (r.plan as "starter" | "pro" | "business") ?? "starter",
    planExpiresAt: r.plan_expires_at ?? null,
    featureOverrides: (r.feature_overrides as Record<string, unknown>) ?? {},
    isPartner: r.is_partner ?? false,
    type: (r.type as RestaurantType) ?? "restaurant",
    hotelRooms: r.hotel_rooms ?? [],
    hotelServices: (r.hotel_services as HotelService[]) ?? [],
    hotelIssues: (r.hotel_issues as HotelService[]) ?? [],
    deliveryEnabled: r.delivery_enabled ?? false,
    deliveryFee: r.delivery_fee ?? 0,
    estimatedDeliveryMinutes: r.estimated_delivery_minutes ?? 30,
    avgRating: Number(r.avg_rating ?? 0),
    reviewCount: r.review_count ?? 0,
  };
}

export function mapCategory(c: CategoryRow): Category {
  return {
    id: c.id,
    restaurantId: c.restaurant_id,
    name: c.name,
    parentId: c.parent_id,
    order: c.order,
    stock: c.stock ?? null,
    visibleToClient: c.visible_to_client ?? true,
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
    stockQuantity: p.stock_quantity ?? null,
    stockConsumption: p.stock_consumption ?? 1,
    order: p.order,
    description: p.description ?? null,
    isDaily: p.is_daily ?? false,
    categoryLinks: p.product_category_links?.map((l) => ({
      id: l.id,
      productId: l.product_id,
      categoryId: l.category_id,
      quantityPerUnit: l.quantity_per_unit,
    })),
  };
}

export function mapProductCategoryLink(l: ProductCategoryLinkRow): ProductCategoryLink {
  return {
    id: l.id,
    productId: l.product_id,
    categoryId: l.category_id,
    quantityPerUnit: l.quantity_per_unit,
  };
}

export function mapOrder(o: OrderRow & { assigned_name?: string | null }): Order {
  return {
    id: o.id,
    restaurantId: o.restaurant_id,
    tableNumber: o.table_number,
    roomLabel: o.room_label ?? null,
    orderType: (o.order_type as OrderType) ?? "food",
    items: o.items,
    total: o.total,
    status: o.status,
    paymentStatus: o.payment_status ?? "unpaid",
    paymentMethod: o.payment_method ?? null,
    paymentProvider: (o.payment_provider as MobileMoneyProvider) ?? null,
    paidAt: o.paid_at ?? null,
    amountReceived: o.amount_received ?? null,
    changeGiven: o.change_given ?? null,
    cashSessionId: o.cash_session_id ?? null,
    assignedTo: o.assigned_to,
    assignedName: o.assigned_name ?? null,
    acknowledgedAt: o.acknowledged_at,
    orderMode: (o.order_mode as OrderMode) ?? "dine_in",
    deliveryQuartier: o.delivery_quartier ?? null,
    deliveryCarrefour: o.delivery_carrefour ?? null,
    deliveryPhone: o.delivery_phone ?? null,
    deliveryFee: o.delivery_fee ?? 0,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export function mapCashSession(r: CashSessionRow): CashSession {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    openedBy: r.opened_by,
    closedBy: r.closed_by,
    openingFloat: r.opening_float,
    closingCashActual: r.closing_cash_actual,
    closingCashExpected: r.closing_cash_expected,
    status: r.status,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapCashExpense(r: CashExpenseRow): CashExpense {
  return {
    id: r.id,
    cashSessionId: r.cash_session_id,
    restaurantId: r.restaurant_id,
    label: r.label,
    amount: r.amount,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export function mapReview(r: ReviewRow): Review {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    orderId: r.order_id,
    customerName: r.customer_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
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
