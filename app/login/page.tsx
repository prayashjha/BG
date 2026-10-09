'use client';
import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui';

function LoginForm() {
  const verified = useSearchParams().get('verified');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg('Signing in…');
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) { setMsg(j.error || `Login failed (server error ${r.status}). Check deployment settings.`); setBusy(false); return; }
      location.href = '/';
    } catch { setMsg('Network error. Please retry.'); setBusy(false); }
  }
  return (
    <main className="grid min-h-screen place-items-center p-3">
      <div className="card w-full max-w-md p-6">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Use your email or Punch ID.</p>
        {verified && <p className="mt-3 rounded-xl bg-green/10 p-3 text-sm text-green">Email verified. Please sign in.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="w-full rounded-xl border p-3" placeholder="Email or Punch ID" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-xl border p-3" placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">Sign in</button>
        </form>
        {msg && <p className="mt-3 text-sm text-red-600" role="status">{msg}</p>}
        <div className="mt-5 flex justify-between text-sm">
          <Link href="/signup" className="text-green">Create account</Link>
          <Link href="/forgot-password" className="text-green">Forgot password?</Link>
        </div>
      </div>
    </main>
  );
}
export default function Login() { return <Suspense><LoginForm /></Suspense>; }
