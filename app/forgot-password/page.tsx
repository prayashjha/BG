'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Forgot() {
  const [e, setE] = useState(''), [m, setM] = useState('');
  async function go(x: FormEvent) {
    x.preventDefault();
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(e.trim().toLowerCase(), { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setM(error ? error.message : 'If this email has an account, a reset link has been sent.');
  }
  return (
    <main className="grid min-h-screen place-items-center p-3">
      <div className="card w-full max-w-md p-6">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Reset password</h1>
        <form onSubmit={go} className="mt-6 space-y-3">
          <input className="w-full rounded-xl border p-3" type="email" placeholder="Email" value={e} onChange={(x) => setE(x.target.value)} required />
          <button className="w-full rounded-xl bg-navy py-3 text-white">Send reset link</button>
        </form>
        {m && <p className="mt-3 text-sm" role="status">{m}</p>}
        <Link href="/login" className="mt-5 block text-sm text-green">Back to login</Link>
      </div>
    </main>
  );
}
