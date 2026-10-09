import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isUuid } from '@/lib/utils';

export const runtime = 'nodejs';

async function guard() {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: p } = await s.from('profiles').select('id,role,status').eq('id', user.id).single();
  return p?.role === 'admin' && p.status === 'approved' ? { user, p } : null;
}
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const now = () => new Date().toISOString();

export async function POST(req: Request) {
  const g = await guard();
  if (!g) return fail('Forbidden', 403);
  let body: any;
  try { body = await req.json(); } catch { return fail('Invalid request.'); }
  const a = supabaseAdmin();
  const action = String(body.action || '');

  try {
    let result: any;

    // ---- leave decision (targets a leave id, not a user) ----
    if (action === 'leave') {
      if (!isUuid(body.leave_id)) return fail('Invalid leave id.');
      if (!['approved', 'rejected'].includes(body.status)) return fail('Invalid leave status.');
      result = await a.from('leaves').update({ status: body.status, reviewed_by: g.user.id, reviewed_at: now() }).eq('id', body.leave_id);
      if (result.error) return fail(result.error.message);
      await a.from('audit_logs').insert({ admin_id: g.user.id, action, target_type: 'leave', target_id: body.leave_id, details: { status: body.status } });
      return NextResponse.json({ ok: true });
    }

    // ---- everything below targets an employee ----
    if (!isUuid(body.user_id)) return fail('Invalid user id.');
    if (body.user_id === g.user.id) return fail('You cannot change your own account here.');
    const { data: target } = await a.from('profiles').select('id,role,status').eq('id', body.user_id).single();
    if (!target) return fail('Employee not found.', 404);
    if (target.role === 'admin') return fail('Admin accounts cannot be changed from this screen.', 403);

    const locationIds: string[] = Array.isArray(body.location_ids) ? body.location_ids.filter(isUuid) : [];
    const checkActive = async (ids: string[]) => {
      if (!ids.length) return true;
      const { data, error } = await a.from('locations').select('id').in('id', ids).eq('is_active', true);
      return !error && (data || []).length === new Set(ids).size;
    };
    let details: any = {};

    switch (action) {
      case 'approve': {
        if (!locationIds.length) return fail('Select at least one active location before approving.');
        if (!(await checkActive(locationIds))) return fail('One or more selected locations are inactive or invalid.');
        if (body.shift_id && !isUuid(body.shift_id)) return fail('Invalid shift.');
        // locations first, status last: a failure can never leave an approved user without a location
        await a.from('employee_locations').delete().eq('user_id', target.id);
        result = await a.from('employee_locations').insert([...new Set(locationIds)].map((location_id) => ({ user_id: target.id, location_id })));
        if (result.error) return fail(result.error.message);
        result = await a.from('profiles').update({ status: 'approved', shift_id: body.shift_id || null, updated_at: now() }).eq('id', target.id);
        details = { location_ids: locationIds, shift_id: body.shift_id || null };
        break;
      }
      case 'reject':
        result = await a.from('profiles').update({ status: 'rejected', updated_at: now() }).eq('id', target.id); break;
      case 'assign_locations': {
        if (!Array.isArray(body.location_ids)) return fail('location_ids must be an array.');
        if (!(await checkActive(locationIds))) return fail('Only active locations can be assigned.');
        await a.from('employee_locations').delete().eq('user_id', target.id);
        result = locationIds.length ? await a.from('employee_locations').insert([...new Set(locationIds)].map((location_id) => ({ user_id: target.id, location_id }))) : { error: null };
        details = { location_ids: locationIds };
        break;
      }
      case 'deactivate':
        result = await a.from('profiles').update({ status: 'inactive', updated_at: now() }).eq('id', target.id); break;
      case 'activate': {
        const { count } = await a.from('employee_locations').select('location_id', { count: 'exact', head: true }).eq('user_id', target.id);
        if (!count) return fail('Assign at least one location before activating.');
        result = await a.from('profiles').update({ status: 'approved', updated_at: now() }).eq('id', target.id); break;
      }
      case 'reset_password': {
        const pw = typeof body.password === 'string' ? body.password : '';
        if (pw.length < 8) return fail('Password must be at least 8 characters.');
        result = await a.auth.admin.updateUserById(target.id, { password: pw });
        // never store the password in the audit log
        break;
      }
      default:
        return fail('Unknown action');
    }
    if (result?.error) return fail(result.error.message);
    await a.from('audit_logs').insert({ admin_id: g.user.id, action, target_type: 'employee', target_id: target.id, details });
    return NextResponse.json({ ok: true });
  } catch {
    return fail('Admin action failed.', 500);
  }
}
