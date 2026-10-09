import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isDateKey, isUuid } from '@/lib/utils';

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

  const from = b.from || null, to = b.to || null, employee = b.employee || null, location = b.location || null;
  if ((from && !isDateKey(from)) || (to && !isDateKey(to)) || (employee && !isUuid(employee)) || (location && !isUuid(location))) {
    return NextResponse.json({ error: 'Invalid filter.' }, { status: 400 });
  }
  const page = Math.max(0, Math.floor(Number(b.page || 0)));
  const pageSize = Math.min(200, Math.max(1, Math.floor(Number(b.pageSize || 50))));

  const a = supabaseAdmin();
  let q = a.from('attendance').select('*,profiles(name,punch_id,email)', { count: 'exact' }).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  if (employee) q = q.eq('user_id', employee);
  if (location) q = q.or(`in_location_id.eq.${location},out_location_id.eq.${location}`);
  q = b.all ? q.range(0, 9999) : q.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rows: data || [], count: count || 0, page, pageSize });
}
