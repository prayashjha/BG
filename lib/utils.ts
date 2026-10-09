export const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kolkata';

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "10:05 AM" in the business timezone (server and browser give the same result). */
export function fmtTime(v: string | null | undefined) {
  return v
    ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: APP_TZ })
    : '—';
}

/** "08 Oct 2026" in the business timezone. */
export function fmtDate(d: Date = new Date()) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: APP_TZ });
}

/** Business-timezone date as YYYY-MM-DD. */
export function todayISO(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Local calendar date of a JS Date as YYYY-MM-DD (never use toISOString for this: it shifts the day in IST). */
export function localKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Add days to a YYYY-MM-DD string without any timezone drift. */
export function addDays(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function cn(...x: (string | false | null | undefined)[]) {
  return x.filter(Boolean).join(' ');
}

/** "09:30:00" -> "9:30 AM" */
export function fmt12(t: string | null | undefined) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
