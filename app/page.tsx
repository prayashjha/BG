import { redirect } from 'next/navigation';
import { Clock, FileText, CalendarPlus } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Header, ShiftBar, BottomNav, Shortcut } from '@/components/ui';
import CalendarStrip from '@/components/calendar-strip';
import { addDays, fmtTime, todayISO } from '@/lib/utils';
import { buildStatusMap, countStatuses } from '@/lib/status';

export default async function Home() {
  const { profile } = await requireProfile();
  if (profile.role === 'admin') redirect('/admin');
  if (profile.status !== 'approved') redirect('/pending');

  const s = await supabaseServer();
  const today = todayISO();
  const yearAgo = addDays(today, -400);
  const created = String(profile.created_at || '').slice(0, 10);
  const from = created && created > yearAgo ? created : yearAgo;

  const [attRes, leaveRes, holRes, shiftRes] = await Promise.all([
    s.from('attendance').select('date,punch_in,punch_out,status').eq('user_id', profile.id).gte('date', from).order('date', { ascending: false }),
    s.from('leaves').select('start_date,end_date,status').eq('user_id', profile.id),
    s.from('holidays').select('date'),
    profile.shift_id ? s.from('shifts').select('*').eq('id', profile.shift_id).single() : Promise.resolve({ data: null }),
  ]);
  const att = attRes.data || [];
  const shift: any = shiftRes.data;

  // Absent / Leave / Holiday are derived (nobody "punches" an absence).
  const statusMap = buildStatusMap({ from, to: addDays(today, 60), today, attendance: att, leaves: leaveRes.data || [], holidays: holRes.data || [] });
  const counts = countStatuses(statusMap, today.slice(0, 7));
  const todayRow = att.find((x) => x.date === today);

  // Welcome poster: today's, else the latest. Signed with the server key so every employee can see it.
  let { data: welcome } = await s.from('daily_welcome').select('*').eq('date', today).maybeSingle();
  if (!welcome) welcome = (await s.from('daily_welcome').select('*').order('date', { ascending: false }).limit(1).maybeSingle()).data;
  let posterUrl: string | null = null;
  if (welcome?.image_url) {
    const z = await supabaseAdmin().storage.from('welcome-posters').createSignedUrl(welcome.image_url, 3600);
    posterUrl = z.data?.signedUrl || null;
  }

  const chips: [string, number, string][] = [
    ['Holiday', counts.Holiday, 'text-blue-800 dark:text-blue-300'],
    ['Present', counts.Present, 'text-green'],
    ['Absent', counts.Absent, 'text-red-500'],
    ['Leave', counts.Leave, 'text-cyan-700 dark:text-cyan-300'],
  ];

  return (
    <main className="safe-bottom min-h-screen">
      <Header profile={{ ...profile, todayIn: todayRow?.punch_in ? fmtTime(todayRow.punch_in) : null, todayOut: todayRow?.punch_out ? fmtTime(todayRow.punch_out) : null }} />
      <ShiftBar shift={shift} />
      <CalendarStrip statusMap={statusMap} />

      <div className="mx-auto max-w-2xl space-y-5 px-3 pt-4">
        {welcome && (
          <div className="card overflow-hidden">
            {posterUrl && <img src={posterUrl} alt="Daily welcome" className="max-h-64 w-full object-cover" />}
            <div className="p-4">
              <div className="font-semibold">Welcome, {String(profile.name).split(' ')[0]}</div>
              {welcome.message && <p className="text-sm text-slate-500">{welcome.message}</p>}
            </div>
          </div>
        )}

        <div className="hide-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2">
          {chips.map(([label, n, c]) => (
            <div className={`card shrink-0 px-5 py-3 text-lg font-medium ${c}`} key={label}>{label} - {n}</div>
          ))}
        </div>

        <h2 className="text-xl font-bold">Shortcuts</h2>
        <div className="grid grid-cols-3 gap-3">
          <Shortcut href="/punch" title="Punch In / Out" icon={Clock} />
          <Shortcut href="/attendance" title="Attendance" icon={FileText} />
          <Shortcut href="/leave" title="Apply for Leave(s)" icon={CalendarPlus} />
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
