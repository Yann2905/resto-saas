import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPlanLimits } from "@/lib/plan-limits";

/**
 * POST /api/push/subscribe — Enregistrer une subscription push
 * Body: { subscription: PushSubscription }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const restaurantId = auth.ctx.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "Aucun restaurant" }, { status: 400 });
  }

  const limits = getPlanLimits(auth.ctx.plan, auth.ctx.featureOverrides, auth.ctx.isPartner);
  if (!limits.pushNotifications) {
    return NextResponse.json(
      { ok: false, error: "Les notifications push nécessitent le plan Pro ou Business" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Subscription invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: auth.ctx.userId,
      restaurant_id: restaurantId,
      endpoint: sub.endpoint,
      keys_p256dh: sub.keys.p256dh,
      keys_auth: sub.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/push/subscribe — Retourner la clé publique VAPID
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ ok: false, error: "VAPID non configuré" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, publicKey });
}
