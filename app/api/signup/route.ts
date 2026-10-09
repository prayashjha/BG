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
    console.error('signup failed', e);
    return NextResponse.json({ error: 'Signup service error. Please try again later.' }, { status: 500 });
  }
}

async function handle(req: Request) {
  if (missingEnv().length) return NextResponse.json({ error: 'Server is not configured yet (environment variables missing). Contact the administrator.' }, { status: 500 });
  const ip = clientIp(req);
  const admin = supabaseAdmin();
  const rl = await admin.rpc('consume_rate_limit', { p_key: `signup:${ip}`, p_max: 5, p_window_seconds: 900 });
  if (rl.error) return NextResponse.json({ error: 'Signup service is temporarily unavailable.' }, { status: 503 });
  if (rl.data !== true) return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const phone = String(body.phone || '').trim();

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Enter a valid full name.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (phone.length > 30) return NextResponse.json({ error: 'Phone number is too long.' }, { status: 400 });

  const c = await cookies();
  const s = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (v) => v.forEach(({ name, value, options }) => c.set(name, value, options)) },
  });
  const origin = new URL(req.url).origin;
  const { data, error } = await s.auth.signUp({
    email, password,
    options: { data: { name, phone }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data.user) return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  // Supabase returns a fake user (no identities) when the email is already registered.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json({ error: 'This email is already registered. Please sign in or reset your password.' }, { status: 409 });
  }

  const { data: p, error: pe } = await admin.from('profiles').select('punch_id').eq('id', data.user.id).single();
  if (pe || !p) return NextResponse.json({ error: 'Account created, but Punch ID could not be loaded. Contact an admin.' }, { status: 500 });
  return NextResponse.json({ ok: true, punch_id: p.punch_id, email_confirmed: Boolean(data.user.email_confirmed_at) });
}
