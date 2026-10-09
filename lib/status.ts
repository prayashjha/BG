import { addDays } from './utils';

export type DayStatus = 'Present' | 'Absent' | 'Leave' | 'Holiday';

/** Weekly-off weekdays, 0 = Sunday. Set NEXT_PUBLIC_WEEKLY_OFF="0" or "0,6" or "" (none). */
export function weeklyOff(): number[] {
  const raw = process.env.NEXT_PUBLIC_WEEKLY_OFF ?? '0';
  return raw.split(',').map((x) => x.trim()).filter((x) => x !== '').map(Number).filter((n) => n >= 0 && n <= 6);
}

const weekday = (key: string) => new Date(key + 'T00:00:00Z').getUTCDay();

/**
 * Builds { 'YYYY-MM-DD': status } for every day between `from` and `to`.
 * Rules: punched in -> Present; approved leave -> Leave; holiday -> Holiday;
 * weekly off -> no mark; past day with nothing -> Absent; today/future with nothing -> no mark.
 */
export function buildStatusMap(opts: {
  from: string; to: string; today: string;
  attendance: { date: string; punch_in: string | null; status?: string }[];
  leaves: { start_date: string; end_date: string; status: string }[];
  holidays: { date: string }[];
}) {
  const { from, to, today } = opts;
  const off = weeklyOff();
  const present = new Set(opts.attendance.filter((a) => a.punch_in).map((a) => a.date));
  const holiday = new Set(opts.holidays.map((h) => h.date));
  const onLeave = new Set<string>();
  for (const l of opts.leaves.filter((x) => x.status === 'approved')) {
    for (let d = l.start_date, i = 0; d <= l.end_date && i < 400; d = addDays(d, 1), i++) onLeave.add(d);
  }
  const map: Record<string, DayStatus> = {};
  for (let d = from, i = 0; d <= to && i < 800; d = addDays(d, 1), i++) {
    if (present.has(d)) map[d] = 'Present';
    else if (onLeave.has(d)) map[d] = 'Leave';
    else if (holiday.has(d)) map[d] = 'Holiday';
    else if (off.includes(weekday(d))) continue;
    else if (d < today) map[d] = 'Absent';
  }
  return map;
}

export function countStatuses(map: Record<string, DayStatus>, monthPrefix: string) {
  const c = { Present: 0, Absent: 0, Leave: 0, Holiday: 0 };
  for (const [k, v] of Object.entries(map)) if (k.startsWith(monthPrefix)) c[v]++;
  return c;
}
