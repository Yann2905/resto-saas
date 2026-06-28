import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 3;

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:yannaristide755@gmail.com";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

function verifyCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ ok: false, error: "VAPID not configured" }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();

  // Grab pending jobs
  const { data: jobs, error: fetchErr } = await admin
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr || !jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Check which orders are still pending (no point notifying for already-handled orders)
  const orderIds = [...new Set(jobs.map((j) => j.order_id as string))];
  const { data: orders } = await admin
    .from("orders")
    .select("id, status")
    .in("id", orderIds);

  const orderStatusMap = new Map<string, string>();
  for (const o of orders ?? []) {
    orderStatusMap.set(o.id, o.status);
  }

  // Get push subscriptions for all target profiles
  const profileIds = [...new Set(jobs.map((j) => j.profile_id as string))];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, keys_p256dh, keys_auth")
    .in("user_id", profileIds);

  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  const webpush = await import("web-push");
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const orderId = job.order_id as string;
    const profileId = job.profile_id as string;
    const orderStatus = orderStatusMap.get(orderId);

    // Skip if order already handled
    if (orderStatus && orderStatus !== "pending") {
      await admin
        .from("notification_queue")
        .update({ status: "skipped", processed_at: new Date().toISOString() })
        .eq("id", job.id);
      skipped++;
      continue;
    }

    const userSubs = subsByUser.get(profileId);
    if (!userSubs || userSubs.length === 0) {
      await admin
        .from("notification_queue")
        .update({ status: "skipped", processed_at: new Date().toISOString() })
        .eq("id", job.id);
      skipped++;
      continue;
    }

    const payload = JSON.stringify(job.payload);
    const results = await Promise.allSettled(
      userSubs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload
        ).catch((err: { statusCode?: number }) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            void admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          throw err;
        })
      )
    );

    const anySuccess = results.some((r) => r.status === "fulfilled");

    if (anySuccess) {
      await admin
        .from("notification_queue")
        .update({
          status: "sent",
          attempts: (job.attempts as number) + 1,
          processed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      sent++;
    } else {
      const newAttempts = (job.attempts as number) + 1;
      await admin
        .from("notification_queue")
        .update({
          status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts: newAttempts,
        })
        .eq("id", job.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, sent, skipped, failed });
}

// Vercel Cron calls GET
export async function GET(req: NextRequest) {
  return POST(req);
}
