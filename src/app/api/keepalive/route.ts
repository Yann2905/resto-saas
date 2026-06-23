import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Endpoint pour empêcher Vercel + Supabase de se mettre en pause.
// Ce script effectue une requête réelle sur la base de données.
// À appeler régulièrement (ex: toutes les heures ou tous les jours) depuis un cron externe (cron-job.org, Vercel Crons, etc.).

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let authOk = false;
  let dbOk = false;
  let errorMsg: string | null = null;
  let latencyMs: number | null = null;

  if (url) {
    const t0 = Date.now();
    try {
      // 1. Ping de l'API Auth (léger)
      const res = await fetch(`${url}/auth/v1/health`, {
        method: "GET",
        cache: "no-store",
      });
      authOk = res.ok;

      // 2. Requête réelle en base de données pour générer de l'activité SQL (évite la mise en pause Supabase)
      const admin = createSupabaseAdminClient();
      const { error } = await admin
        .from("restaurants")
        .select("id")
        .limit(1);

      if (error) {
        errorMsg = error.message;
      } else {
        dbOk = true;
      }

      latencyMs = Date.now() - t0;
    } catch (err: any) {
      errorMsg = err?.message || String(err);
    }
  }

  return NextResponse.json(
    {
      ok: dbOk,
      ts: new Date().toISOString(),
      auth: { ok: authOk },
      database: { ok: dbOk, error: errorMsg },
      latencyMs,
    },
    {
      status: dbOk ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
