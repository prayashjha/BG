'use client';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Reset() {
  const [p, setP] = useState(''), [m, setM] = useState('');
  async function go(e: FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setM('This reset link is invalid or expired. Please request a new one.'); return; }
    const { error } = await sb.auth.updateUser({ password: p });
    setM(error ? error.message : 'Password changed.');
    if (!error) setTimeout(() => { location.href = '/'; }, 800);
  }
  return (
    <main className="grid min-h-screen place-items-center p-3">
      <div className="card w-full max-w-md p-6">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Choose new password</h1>
        <form onSubmit={go} className="mt-6 space-y-3">
          <input className="w-full rounded-xl border p-3" type="password" minLength={8} autoComplete="new-password" placeholder="New password (min 8)" value={p} onChange={(e) => setP(e.target.value)} required />
          <button className="w-full rounded-xl bg-green py-3 text-white">Update password</button>
        </form>
        {m && <p className="mt-3 text-sm" role="status">{m}</p>}
      </div>
    </main>
  );
}
