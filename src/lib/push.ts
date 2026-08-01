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
  onlineOnly?: boolean,
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[push] VAPID keys not configured, skipping push");
    return;
  }

  const admin = createSupabaseAdminClient();

  let userIds: string[] | null = null;

  if (onlineOnly && !targetUserId) {
    const { data: onlineProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("is_online", true);

    if (!onlineProfiles || onlineProfiles.length === 0) return;
    userIds = onlineProfiles.map((p) => p.id as string);
  }

  if (targetUserId) {
    if (onlineOnly) {
      const { data: profile } = await admin
        .from("profiles")
        .select("is_online")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!profile || !profile.is_online) return;
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", targetUserId);

    if (!subs || subs.length === 0) return;
    await sendToSubscriptions(subs, payload);
    return;
  }

  let query = admin
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("restaurant_id", restaurantId);

  if (userIds) {
    query = query.in("user_id", userIds);
  }

  const { data: subs } = await query;
  if (!subs || subs.length === 0) return;
  await sendToSubscriptions(subs, payload);
}

async function sendToSubscriptions(
  subs: { endpoint: string; keys_p256dh: string; keys_auth: string }[],
  payload: PushPayload,
) {
  const admin = createSupabaseAdminClient();
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
