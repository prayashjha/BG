import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Email verification and password-reset links land here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (code) {
    const s = await supabaseServer();
    const { error } = await s.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  // Link opened on another device/browser, or already used: the email may still be verified.
  return NextResponse.redirect(new URL('/login?verified=1', url.origin));
}
