import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';
import { haversineM, todayISO } from '@/lib/utils';

export const runtime = 'nodejs';
const MAX_ACCURACY_M = 25;

export async function POST(req: Request) {
  try {
    const s = await supabaseServer();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = supabaseAdmin();
    const rl = await admin.rpc('consume_rate_limit', { p_key: `punch:${user.id}`, p_max: 6, p_window_seconds: 600 });
    if (rl.error) return NextResponse.json({ error: 'Punch service is temporarily unavailable.' }, { status: 503 });
    if (rl.data !== true) return NextResponse.json({ error: 'Too many punch attempts. Please wait and retry.' }, { status: 429 });

    const form = await req.formData();
    const mode = String(form.get('mode') || '');
    const rawLat = form.get('lat'), rawLng = form.get('lng'), rawAcc = form.get('accuracy');
    const lat = Number(rawLat), lng = Number(rawLng), accuracy = Number(rawAcc);
    const selfie = form.get('selfie');
    if (!['in', 'out'].includes(mode) || rawLat === null || rawLng === null || rawAcc === null || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(accuracy) || !(selfie instanceof File)) {
      return NextResponse.json({ error: 'Invalid punch payload' }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy < 0 || accuracy > 10000) {
      return NextResponse.json({ error: 'Invalid GPS values.' }, { status: 400 });
    }
    if (selfie.size < 1000 || selfie.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Selfie must be an image under 5 MB' }, { status: 400 });
    const bytes = new Uint8Array(await selfie.arrayBuffer());
    // The camera always produces JPEG: check the real file signature, not just the declared type.
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return NextResponse.json({ error: 'Selfie must be a JPEG image.' }, { status: 400 });

    const { data: p } = await admin.from('profiles').select('id,status,role').eq('id', user.id).single();
    if (!p || p.status !== 'approved' || p.role !== 'employee') return NextResponse.json({ error: 'Account is not approved for punching' }, { status: 403 });
    if (accuracy > MAX_ACCURACY_M) return NextResponse.json({ error: `GPS accuracy is ${Math.round(accuracy)} m. Wait for a better GPS fix and retry.` }, { status: 400 });

    const { data: els } = await admin.from('employee_locations').select('location_id,locations(*)').eq('user_id', user.id);
    const active = (els || []).map((x: any) => x.locations).filter((x: any) => x?.is_active);
    if (!active.length) return NextResponse.json({ error: 'No active location is assigned to you.' }, { status: 403 });

    let best: { location: any; distance: number } | null = null;
    for (const l of active) {
      const dist = haversineM(lat, lng, l.lat, l.lng);
      if (!best || dist < best.distance) best = { location: l, distance: dist };
    }
    if (!best) return NextResponse.json({ error: 'No active location is assigned to you.' }, { status: 403 });
    if (best.distance > best.location.radius_m) {
      return NextResponse.json({ error: `You are ${Math.round(best.distance)} m away. Move within ${best.location.radius_m} m of the office.`, distance_m: best.distance }, { status: 403 });
    }

    const now = new Date();
    const date = todayISO(now);
    const { data: existing } = await admin.from('attendance').select('*').eq('user_id', user.id).eq('date', date).maybeSingle();
    if (mode === 'in' && existing?.punch_in) return NextResponse.json({ error: 'Punch in already recorded for today.' }, { status: 409 });
    if (mode === 'out' && (!existing?.punch_in || existing?.punch_out)) {
      return NextResponse.json({ error: !existing?.punch_in ? 'Punch in is required first.' : 'Punch out already recorded for today.' }, { status: 409 });
    }

    // Basic spoofing signals (flag for admin review, never claimed to be foolproof)
    let flagged = Boolean(existing?.flagged);
    let reason: string = existing?.flag_reason || '';
    const previous = existing?.punch_in ? new Date(existing.punch_in) : null;
    if (previous && Math.abs(now.getTime() - previous.getTime()) < 60 * 1000) { flagged = true; reason = reason || 'Unusually fast punch sequence'; }
    if (existing && Number.isFinite(existing.in_lat) && Number.isFinite(existing.in_lng) && haversineM(existing.in_lat, existing.in_lng, lat, lng) > 1000) {
      flagged = true; reason = reason || 'Sudden GPS jump detected';
    }

    const path = `${user.id}/${date}-${mode}-${now.getTime()}.jpg`;
    const up = await admin.storage.from('punch-selfies').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (up.error) return NextResponse.json({ error: 'Could not store selfie. Please retry.' }, { status: 500 });

    const patch = mode === 'in'
      ? { user_id: user.id, date, punch_in: now.toISOString(), in_lat: lat, in_lng: lng, in_accuracy: accuracy, in_distance_m: best.distance, in_selfie_url: path, in_location_id: best.location.id, status: 'Present', flagged, flag_reason: reason || null, updated_at: now.toISOString() }
      : { punch_out: now.toISOString(), out_lat: lat, out_lng: lng, out_accuracy: accuracy, out_distance_m: best.distance, out_selfie_url: path, out_location_id: best.location.id, flagged, flag_reason: reason || null, updated_at: now.toISOString() };

    const q = existing ? await admin.from('attendance').update(patch).eq('id', existing.id) : await admin.from('attendance').insert(patch);
    if (q.error) {
      await admin.storage.from('punch-selfies').remove([path]);
      // unique(user_id,date) catches two simultaneous punch-ins
      const dup = q.error.code === '23505';
      return NextResponse.json({ error: dup ? 'Punch in already recorded for today.' : 'Could not save punch. Please retry.' }, { status: dup ? 409 : 500 });
    }
    return NextResponse.json({ ok: true, distance_m: best.distance, flagged });
  } catch (e: any) {
    return NextResponse.json({ error: 'Punch failed. Please retry.' }, { status: 500 });
  }
}
