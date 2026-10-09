import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
// SVG is deliberately NOT allowed (it can carry scripts).
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req: Request) {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const f = (await req.formData()).get('photo');
  if (!(f instanceof File) || !EXT[f.type] || f.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'JPG, PNG or WebP image only, max 5 MB' }, { status: 400 });
  const path = `${user.id}/profile-${Date.now()}.${EXT[f.type]}`;
  const a = supabaseAdmin();
  const up = await a.storage.from('profile-photos').upload(path, new Uint8Array(await f.arrayBuffer()), { contentType: f.type, upsert: false });
  if (up.error) return NextResponse.json({ error: 'Could not upload photo.' }, { status: 500 });
  const upd = await a.from('profiles').update({ photo_url: path, updated_at: new Date().toISOString() }).eq('id', user.id);
  if (upd.error) return NextResponse.json({ error: 'Could not save photo.' }, { status: 500 });
  const { data } = await a.storage.from('profile-photos').createSignedUrl(path, 3600);
  return NextResponse.json({ path, url: data?.signedUrl });
}

export async function GET(req: Request) {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const path = new URL(req.url).searchParams.get('path');
  if (!path || path.includes('..')) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  const a = supabaseAdmin();
  const { data: p } = await a.from('profiles').select('id,role').eq('id', user.id).single();
  if (!p || (!path.startsWith(`${user.id}/`) && p.role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await a.storage.from('profile-photos').createSignedUrl(path, 600);
  return error ? NextResponse.json({ error: 'Not found' }, { status: 404 }) : NextResponse.json({ url: data.signedUrl });
}
