import { NextResponse } from 'next/server';
import { missingEnv } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Open /api/health after deploying. Shows only true/false - never any secret value.
export async function GET() {
  const missing = missingEnv();
  const out: Record<string, unknown> = { env_ok: missing.length === 0, missing_env: missing };
  if (missing.length === 0) {
    try {
      const a = supabaseAdmin();
      const rl = await a.rpc('consume_rate_limit', { p_key: 'health', p_max: 1000000, p_window_seconds: 60 });
      out.database_functions_ok = !rl.error;
      if (rl.error) out.database_hint = 'Run supabase/001_init.sql in the Supabase SQL Editor.';
      const pr = await a.from('profiles').select('id', { count: 'exact', head: true });
      out.profiles_table_ok = !pr.error;
    } catch {
      out.database_functions_ok = false;
      out.database_hint = 'Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and the service role key.';
    }
  }
  return NextResponse.json(out, { status: out.env_ok && out.database_functions_ok ? 200 : 503 });
}
