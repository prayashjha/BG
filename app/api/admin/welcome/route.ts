import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isDateKey } from '@/lib/utils';

export const runtime = 'nodejs';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req: Request) {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: p } = await s.from('profiles').select('role,status').eq('id', user.id).single();
  if (p?.role !== 'admin' || p.status !== 'approved') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const f = await req.formData();
  const date = String(f.get('date') || '');
  const message = String(f.get('message') || '').slice(0, 500);
  const file = f.get('image');
  if (!isDateKey(date)) return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });

  const a = supabaseAdmin();
  let path: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!EXT[file.type] || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'JPG, PNG or WebP image only, max 5 MB' }, { status: 400 });
    path = `${date}-${Date.now()}.${EXT[file.type]}`;
    const up = await a.storage.from('welcome-posters').upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (up.error) return NextResponse.json({ error: 'Could not upload image.' }, { status: 500 });
  }
  // Saving only a new message for a date must not erase the poster saved earlier.
  const row: any = { date, message, created_by: user.id };
  if (path) row.image_url = path;
  const q = await a.from('daily_welcome').upsert(row);
  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 400 });
  await a.from('audit_logs').insert({ admin_id: user.id, action: 'welcome_update', target_type: 'daily_welcome', target_id: date, details: { date, message } });
  return NextResponse.json({ ok: true });
}
