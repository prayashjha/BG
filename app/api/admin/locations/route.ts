import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isUuid } from '@/lib/utils';

export const runtime = 'nodejs';

async function guard() {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: p } = await s.from('profiles').select('role,status').eq('id', user.id).single();
  return p?.role === 'admin' && p.status === 'approved' ? user : null;
}

export async function POST(req: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const name = String(b.name || '').trim();
  const lat = Number(b.lat), lng = Number(b.lng), radius = Number(b.radius_m);
  if (!name || name.length > 120 || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || !Number.isFinite(radius) || radius < 1 || radius > 5000) {
    return NextResponse.json({ error: 'Valid name, coordinates and radius (1–5000 m) are required.' }, { status: 400 });
  }
  if (b.id && !isUuid(b.id)) return NextResponse.json({ error: 'Invalid location id.' }, { status: 400 });

  const a = supabaseAdmin();
  const payload: any = { name, lat, lng, radius_m: Math.round(radius) };
  // Only touch is_active when it is actually sent; editing a location must not silently deactivate it.
  if (typeof b.is_active === 'boolean') payload.is_active = b.is_active;
  else if (!b.id) payload.is_active = true;

  const q = b.id
    ? await a.from('locations').update(payload).eq('id', b.id).select('id').single()
    : await a.from('locations').insert(payload).select('id').single();
  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 400 });

  await a.from('audit_logs').insert({ admin_id: user.id, action: b.id ? 'location_update' : 'location_create', target_type: 'location', target_id: q.data?.id ?? null, details: payload });
  return NextResponse.json({ ok: true, id: q.data?.id });
}
