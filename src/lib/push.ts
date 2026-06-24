/**
 * Envoie des push notifications à tous les abonnés d'un restaurant
 * (ou filtré par user_id pour un serveur spécifique)
 */
import { createSupabaseAdminClient } from "./supabase-admin";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:yannaristide755@gmail.com";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToRestaurant(
  restaurantId: string,
  payload: PushPayload,
  targetUserId?: string | null,
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[push] VAPID keys not configured, skipping push");
    return;
  }

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("restaurant_id", restaurantId);

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  }

  const { data: subs } = await query;
  if (!subs || subs.length === 0) return;

  const webpush = await import("web-push");

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  const jsonBody = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        jsonBody,
      ).catch((err: { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          void admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      })
    )
  );
}
