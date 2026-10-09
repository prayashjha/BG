'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { localKey } from '@/lib/utils';

// statusMap = { 'YYYY-MM-DD': 'Present' | 'Absent' | 'Leave' | 'Holiday' }, computed on the server.
export default function CalendarStrip({ statusMap }: { statusMap: Record<string, string> }) {
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const status = (d: Date) => statusMap[localKey(d)];

  const week = useMemo(() => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, []);

  const month = useMemo(() => {
    const y = now.getFullYear(), m = now.getMonth();
    const lead = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    return { y, m, cells: Array.from({ length: lead + days }, (_, i) => (i < lead ? null : new Date(y, m, i - lead + 1))) };
  }, [now]);

  const cls = (st?: string) =>
    st === 'Present' ? 'bg-green text-white'
    : st === 'Holiday' ? 'bg-blue-500 text-white'
    : st === 'Absent' ? 'bg-red-500 text-white'
    : st === 'Leave' ? 'bg-amber-500 text-white'
    : 'bg-white text-[var(--text)] dark:bg-slate-800';

  const step = (n: number) => setNow(new Date(month.y, month.m + n, 1));
  const todayKey = localKey(new Date());

  return (
    <div className="bg-[var(--card)] shadow-sm">
      <div className="mx-auto max-w-2xl px-1.5 pb-3 pt-4">
      <button onClick={() => setOpen(true)} className="mx-auto flex items-center gap-2 text-lg uppercase tracking-wide" aria-label="Open month and year picker">
        {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} <ChevronDown size={20} />
      </button>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map((d) => (
          <div key={localKey(d)} className="min-w-0 text-center">
            <div className="text-sm text-slate-500">{d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1)}</div>
            <div className={`mt-1 grid h-10 place-items-center rounded-full text-base font-medium ${cls(status(d))} ${localKey(d) === todayKey ? 'ring-2 ring-navy dark:ring-white' : ''}`}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Month and year">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-[#15202a]">
            <div className="flex items-center justify-between">
              <b>Month &amp; year</b>
              <button onClick={() => setOpen(false)} className="tap rounded-xl border px-3">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-[44px_1fr_1fr_44px] items-center gap-2">
              <button aria-label="Previous month" onClick={() => step(-1)} className="tap grid place-items-center rounded-xl border"><ChevronLeft size={18} /></button>
              <select className="min-w-0 rounded-xl border p-3" value={month.m} onChange={(e) => setNow(new Date(month.y, +e.target.value, 1))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>)}
              </select>
              <select className="min-w-0 rounded-xl border p-3" value={month.y} onChange={(e) => setNow(new Date(+e.target.value, month.m, 1))}>
                {Array.from({ length: 11 }, (_, i) => { const y = new Date().getFullYear() - 5 + i; return <option key={y} value={y}>{y}</option>; })}
              </select>
              <button aria-label="Next month" onClick={() => step(1)} className="tap grid place-items-center rounded-xl border"><ChevronRight size={18} /></button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((x) => <div key={x} className="py-1 text-slate-500">{x}</div>)}
              {month.cells.map((d, i) => d
                ? <div key={i} className={`grid h-9 place-items-center rounded-full ${cls(status(d))}`}>{d.getDate()}</div>
                : <div key={i} />)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-green/10 px-2 py-1 text-green">Present</span>
              <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">Absent</span>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600">Holiday</span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Leave</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
