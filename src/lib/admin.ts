"use client";

import type { OpeningHours } from "@/types";

// Client helpers : appellent les API routes (qui utilisent le service role).

export type CreateRestaurantInput = {
  slug: string;
  name: string;
  address: string;
  phone: string;
  ownerEmail: string;
  ownerPassword: string;
  subscriptionExpiresAt: Date | null;
};

export type CreateRestaurantResult =
  | { ok: true; restaurantId: string; ownerUid: string }
  | { ok: false; error: string };

export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function createRestaurantWithOwner(
  input: CreateRestaurantInput
): Promise<CreateRestaurantResult> {
  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "Slug invalide" };

  return postJSON<CreateRestaurantResult>("/api/admin/restaurants", {
    ...input,
    slug,
    subscriptionExpiresAt: input.subscriptionExpiresAt
      ? input.subscriptionExpiresAt.toISOString()
      : null,
  });
}

type UpdatePayload = {
  restaurantId: string;
  name?: string;
  address?: string;
  phone?: string;
  active?: boolean;
  subscriptionExpiresAt?: string | null;
  openingHours?: OpeningHours | null;
};

export async function updateRestaurant(payload: UpdatePayload): Promise<void> {
  const res = await postJSON<{ ok: boolean; error?: string }>(
    "/api/admin/restaurants/update",
    payload
  );
  if (!res.ok) throw new Error(res.error || "Erreur");
}

export async function setRestaurantActive(
  restaurantId: string,
  active: boolean
): Promise<void> {
  await updateRestaurant({ restaurantId, active });
}

export async function setRestaurantSubscription(
  restaurantId: string,
  date: Date | null
): Promise<void> {
  await updateRestaurant({
    restaurantId,
    subscriptionExpiresAt: date ? date.toISOString() : null,
  });
}

export async function updateRestaurantInfo(
  restaurantId: string,
  payload: { name: string; address: string; phone: string }
): Promise<void> {
  await updateRestaurant({ restaurantId, ...payload });
}

export async function updateRestaurantHours(
  restaurantId: string,
  hours: OpeningHours | null
): Promise<void> {
  await updateRestaurant({ restaurantId, openingHours: hours });
}

export async function deleteRestaurant(restaurantId: string): Promise<void> {
  const res = await postJSON<{ ok: boolean; error?: string }>(
    "/api/admin/restaurants/delete",
    { restaurantId }
  );
  if (!res.ok) throw new Error(res.error || "Erreur");
}
