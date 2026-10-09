import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { clientIp, missingEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error('login failed', e);
    return NextResponse.json({ error: 'Login service error. Please try again or contact the administrator.' }, { status: 500 });
  }
}

async function handle(req: Request) {
  const missing = missingEnv();
  if (missing.length) {
    console.error('Missing environment variables:', missing.join(', '));
    return NextResponse.json({ error: 'Server is not configured yet (environment variables missing). Contact the administrator.' }, { status: 500 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

  const ip = clientIp(req);
  // If the real IP is unknown, limit per email instead of putting every user in one shared bucket.
  const rlKey = ip !== 'unknown' ? `login:${ip}` : `login:email:${String(body.email || '').trim().toLowerCase().slice(0, 120)}`;
  const admin = supabaseAdmin();
  const allowed = await admin.rpc('consume_rate_limit', { p_key: rlKey, p_max: 10, p_window_seconds: 900 });
  if (allowed.error) {
    console.error('consume_rate_limit failed (was supabase/001_init.sql run?):', allowed.error.message);
    return NextResponse.json({ error: 'Login service is temporarily unavailable. Contact the administrator.' }, { status: 503 });
  }
  if (allowed.data !== true) return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });

  let email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return NextResponse.json({ error: 'Email/Punch ID and password are required.' }, { status: 400 });

  // Punch ID login: digits only -> look up the email
  if (/^\d{1,9}$/.test(email)) {
    const { data } = await admin.from('profiles').select('email').eq('punch_id', Number(email)).maybeSingle();
    if (data?.email) email = data.email;
  }

  const c = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (v) => v.forEach(({ name, value, options }) => c.set(name, value, options)) },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase refuses unverified users itself, so show a useful message instead of "invalid credentials".
    if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
      return NextResponse.json({ error: 'Please verify your email first. Check your inbox for the verification link.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid login credentials.' }, { status: 401 });
  }
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Please verify your email before signing in.' }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
