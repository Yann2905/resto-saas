"use client";

import { supabase } from "./supabase";

export type DayRevenue = {
  day: string; // YYYY-MM-DD
  revenue: number;
  ordersCount: number;
};

export type TopProduct = {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
};

export type PeakHour = {
  hour: number;
  ordersCount: number;
  revenue: number;
};

export type StatsSummary = {
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
};

export async function getSummary(
  restaurantId: string,
  from: Date,
  to: Date
): Promise<StatsSummary> {
  const { data } = await supabase
    .rpc("restaurant_stats", {
      p_restaurant_id: restaurantId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    })
    .single();
  const row = data as {
    total_revenue: number;
    total_orders: number;
    avg_ticket: number;
  } | null;
  return {
    totalRevenue: Number(row?.total_revenue ?? 0),
    totalOrders: Number(row?.total_orders ?? 0),
    avgTicket: Number(row?.avg_ticket ?? 0),
  };
}

export async function getRevenueByDay(
  restaurantId: string,
  days: number = 14
): Promise<DayRevenue[]> {
  const { data } = await supabase.rpc("restaurant_revenue_by_day", {
    p_restaurant_id: restaurantId,
    p_days: days,
  });
  return ((data ?? []) as Array<{
    day: string;
    revenue: number;
    orders_count: number;
  }>).map((r) => ({
    day: r.day,
    revenue: Number(r.revenue),
    ordersCount: Number(r.orders_count),
  }));
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getRevenueSeries(
  restaurantId: string,
  from: Date,
  to: Date
): Promise<DayRevenue[]> {
  const { data } = await supabase.rpc("restaurant_revenue_series", {
    p_restaurant_id: restaurantId,
    p_from: toIsoDate(from),
    p_to: toIsoDate(to),
  });
  return ((data ?? []) as Array<{
    day: string;
    revenue: number;
    orders_count: number;
  }>).map((r) => ({
    day: r.day,
    revenue: Number(r.revenue),
    ordersCount: Number(r.orders_count),
  }));
}

export async function getTopProducts(
  restaurantId: string,
  from: Date,
  to: Date,
  limit = 5
): Promise<TopProduct[]> {
  const { data } = await supabase.rpc("restaurant_top_products", {
    p_restaurant_id: restaurantId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_limit: limit,
  });
  return ((data ?? []) as Array<{
    product_id: string;
    product_name: string;
    qty_sold: number;
    revenue: number;
  }>).map((r) => ({
    productId: r.product_id,
    productName: r.product_name,
    qtySold: Number(r.qty_sold),
    revenue: Number(r.revenue),
  }));
}

export async function getPeakHours(
  restaurantId: string,
  from: Date,
  to: Date
): Promise<PeakHour[]> {
  const { data } = await supabase.rpc("restaurant_peak_hours", {
    p_restaurant_id: restaurantId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  return ((data ?? []) as Array<{
    hour: number;
    orders_count: number;
    revenue: number;
  }>).map((r) => ({
    hour: Number(r.hour),
    ordersCount: Number(r.orders_count),
    revenue: Number(r.revenue),
  }));
}
