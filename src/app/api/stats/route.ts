import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const restaurantId =
    req.nextUrl.searchParams.get("restaurantId") ?? auth.ctx.restaurantId;
  if (!restaurantId)
    return NextResponse.json({ ok: false, error: "Missing restaurantId" }, { status: 400 });

  if (auth.ctx.role !== "superadmin" && auth.ctx.restaurantId !== restaurantId)
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "0", 10);
  const mode = req.nextUrl.searchParams.get("mode") ?? "range"; // "range" | "month"

  if (!from || !to)
    return NextResponse.json({ ok: false, error: "Missing from/to" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  try {
    const [summaryRes, dayRes, topRes, peakRes] = await Promise.all([
      admin.rpc("restaurant_stats", {
        p_restaurant_id: restaurantId,
        p_from: from,
        p_to: to,
      }).single(),

      mode === "month"
        ? admin.rpc("restaurant_revenue_series", {
            p_restaurant_id: restaurantId,
            p_from: from.split("T")[0],
            p_to: to.split("T")[0],
          })
        : admin.rpc("restaurant_revenue_by_day", {
            p_restaurant_id: restaurantId,
            p_days: days || 14,
          }),

      admin.rpc("restaurant_top_products", {
        p_restaurant_id: restaurantId,
        p_from: from,
        p_to: to,
        p_limit: 5,
      }),

      admin.rpc("restaurant_peak_hours", {
        p_restaurant_id: restaurantId,
        p_from: from,
        p_to: to,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      summary: summaryRes.data,
      byDay: dayRes.data ?? [],
      top: topRes.data ?? [],
      peak: peakRes.data ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur stats" },
      { status: 500 }
    );
  }
}
