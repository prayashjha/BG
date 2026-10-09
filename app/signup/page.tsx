'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui';

export default function Signup() {
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [phone, setPhone] = useState('');
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg('Creating account…');
    try {
      const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, phone }) });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) { setMsg(j.error || `Could not create account (server error ${r.status}).`); setBusy(false); return; }
      setDone(true);
      setMsg(`Verification email sent to ${email}. Your Punch ID is ${j.punch_id}. Verify your email, then wait for admin approval.`);
    } catch { setMsg('Network error. Please retry.'); setBusy(false); }
  }
  return (
    <main className="grid min-h-screen place-items-center p-3">
      <div className="card w-full max-w-md p-6">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Create account</h1>
        {!done && (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input className="w-full rounded-xl border p-3" placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="w-full rounded-xl border p-3" placeholder="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full rounded-xl border p-3" placeholder="Phone (optional)" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="w-full rounded-xl border p-3" placeholder="Password (min 8)" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full rounded-xl bg-green py-3 font-semibold text-white disabled:opacity-60">Sign up</button>
          </form>
        )}
        {msg && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800" role="status">{msg}</p>}
        <p className="mt-5 text-sm">Already have an account? <Link href="/login" className="text-green">Sign in</Link></p>
      </div>
    </main>
  );
}
