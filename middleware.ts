import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const path0 = request.nextUrl.pathname;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Without this check every page (even /login) crashes with a blank 500.
    if (path0.startsWith('/api')) return NextResponse.json({ error: 'Server is not configured (Supabase variables missing).' }, { status: 500 });
    return new NextResponse('Server is not configured: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, then redeploy. Open /api/health for details.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  let user: unknown = null;
  try { user = (await supabase.auth.getUser()).data.user; } catch { user = null; }

  const path = request.nextUrl.pathname;
  const isApi = path.startsWith('/api');
  const isPublic = PUBLIC_PAGES.some((p) => path === p || path.startsWith(p + '/'));
  // Pages need a login; API routes answer 401/403 themselves.
  if (!user && !isApi && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js).*)'],
};
