import { NextResponse } from "next/server";

// Endpoint léger pour empêcher Vercel + Supabase de "geler".
// À appeler toutes les 5 minutes depuis un cron externe (cron-job.org, etc.).
// On fait un ping HEAD très bon marché vers Supabase (sans toucher la base)
// pour garder le DNS/TLS et la lambda chauds.

export const runtime = "edge"; // démarrage <100ms (vs Node ~500ms)

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseOk = false;
  let supabaseLatencyMs: number | null = null;

  if (url) {
    const t0 = Date.now();
    try {
      // /auth/v1/health est public et ultra-léger
      const res = await fetch(`${url}/auth/v1/health`, {
        method: "GET",
        cache: "no-store",
      });
      supabaseOk = res.ok;
      supabaseLatencyMs = Date.now() - t0;
    } catch {
      supabaseOk = false;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      runtime: "edge",
      supabase: { ok: supabaseOk, latencyMs: supabaseLatencyMs },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
