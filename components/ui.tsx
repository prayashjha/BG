'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, User, MoreHorizontal, Sun, Moon, X } from 'lucide-react';
import { useTheme } from './theme-provider';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { fmtDate, fmt12 } from '@/lib/utils';
import { Mail, Briefcase, IdCard, BadgeCheck } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-lg font-bold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-green text-white">BG</span>BGattendance
    </div>
  );
}

export function BottomNav() {
  const path = usePathname();
  const items: [string, string, any][] = [['/', 'Home', Home], ['/attendance', 'Attendance', CalendarDays], ['/profile', 'Profile', User], ['/more', 'More', MoreHorizontal]];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy pb-[env(safe-area-inset-bottom)] text-white" aria-label="Main">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(([href, label, I]) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`tap flex min-w-0 flex-col items-center justify-center gap-0.5 py-2.5 text-xs ${active ? 'font-semibold text-white' : 'text-white/55'}`}>
              <I size={24} /><span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button aria-label="Toggle theme" onClick={toggle} className="tap grid place-items-center rounded-full bg-white/10 p-2 text-white">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export async function logout() {
  await supabaseBrowser().auth.signOut();
  location.href = '/login';
}

export function Header({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto max-w-2xl px-3 pb-4 pt-4">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <button aria-label="Open profile" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full bg-green"><User size={22} /></button>
            <h1 className="truncate text-center text-xl font-medium">{profile.name}</h1>
            <ThemeToggle />
          </div>
          <p className="mt-2 text-center text-lg font-semibold" suppressHydrationWarning>{fmtDate()}</p>
          <div className="mt-3 grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-sm">
            <span className="text-white/90">In Time</span>
            <span className="rounded-full bg-green py-2 text-center font-medium">{profile.todayIn || '-'}</span>
            <span className="text-white/90">Out Time</span>
            <span className="rounded-full bg-green py-2 text-center font-medium">{profile.todayOut || '-'}</span>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Profile" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-navy text-white" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-5 pb-5 pt-6 text-center">
              <button aria-label="Close" onClick={() => setOpen(false)} className="absolute right-2 top-2 grid h-11 w-11 place-items-center"><X size={24} /></button>
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-green"><User size={52} /></div>
              <h2 className="mt-3 text-xl font-semibold">{profile.name}</h2>
              <p className="text-sm text-white/80">Punch ID: {profile.punch_id}</p>
            </div>
            <dl className="bg-slate-50 text-sm text-slate-900">
              {[[Mail, 'Email', profile.email], [IdCard, 'Punch ID', String(profile.punch_id)], [Briefcase, 'Role', profile.role], [BadgeCheck, 'Status', profile.status]].map(([I, k, v]: any) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-0">
                  <dt className="flex items-center gap-2 text-slate-600"><I size={18} />{k}</dt>
                  <dd className="min-w-0 break-all text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/profile" onClick={() => setOpen(false)} className="tap flex items-center justify-center py-4 font-semibold">See more</Link>
          </div>
        </div>
      )}
    </>
  );
}

export function ShiftBar({ shift }: { shift: any }) {
  return (
    <div className="bg-[#1B6B2A] text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-3 py-3">
        <span className="text-lg font-medium">Current Shift</span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          <Sun size={16} className="shrink-0" />
          <span className="truncate">{shift ? `${shift.name}: ${fmt12(shift.start_time)} to ${fmt12(shift.end_time)}` : 'Not assigned'}</span>
        </span>
      </div>
    </div>
  );
}

export function Shortcut({ href, title, icon: Icon }: { href: string; title: string; icon: any }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col items-center gap-2 text-center text-sm font-semibold">
      <span className="grid h-24 w-full place-items-center rounded-2xl bg-slate-100 text-green dark:bg-slate-800"><Icon size={40} strokeWidth={1.6} /></span>
      <span className="leading-tight">{title}</span>
    </Link>
  );
}
