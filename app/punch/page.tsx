'use client';
import { useState } from 'react';
import { MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CameraPunch, { PunchCapture } from '@/components/camera-punch';

export default function Punch() {
  const [mode, setMode] = useState<'in' | 'out' | null>(null), [msg, setMsg] = useState(''), [ok, setOk] = useState(false), [sending, setSending] = useState(false);

  async function done(r: PunchCapture) {
    if (sending || !mode) return;
    setSending(true); setOk(false); setMsg('Validating GPS and uploading selfie…');
    try {
      const fd = new FormData();
      fd.append('mode', mode);
      fd.append('lat', String(r.lat)); fd.append('lng', String(r.lng)); fd.append('accuracy', String(r.accuracy));
      fd.append('selfie', r.blob, 'selfie.jpg');
      const res = await fetch('/api/punch', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error || 'Punch failed'); return; }
      setOk(true);
      setMsg(`${mode === 'in' ? 'Punch in' : 'Punch out'} successful. Distance: ${Math.round(j.distance_m)} m${j.flagged ? ' (flagged for review)' : ''}`);
      setMode(null);
    } catch { setMsg('Network error. Please retry.'); }
    finally { setSending(false); }
  }

  return (
    <main className="min-h-screen p-3">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-5 inline-flex min-h-[44px] items-center gap-2 text-sm"><ArrowLeft size={16} /> Home</Link>
        <div className="card p-5">
          <h1 className="text-2xl font-bold">Punch attendance</h1>
          {!mode ? (
            <>
              <p className="mt-2 text-sm text-slate-500">GPS must be accurate within 25 m and you must be inside your assigned active location.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => { setMsg(''); setMode('in'); }} className="tap rounded-2xl bg-green py-5 font-semibold text-white">Punch In</button>
                <button onClick={() => { setMsg(''); setMode('out'); }} className="tap rounded-2xl bg-navy py-5 font-semibold text-white">Punch Out</button>
              </div>
            </>
          ) : (
            <>
              <div className="my-5 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><MapPin size={18} /> Live GPS + front camera required</div>
              <CameraPunch mode={mode} onDone={done} />
              <button onClick={() => setMode(null)} className="mt-3 w-full rounded-xl border py-3">Cancel</button>
            </>
          )}
          {msg && <p className={`mt-4 rounded-xl p-3 text-sm ${ok ? 'bg-green/10 text-green' : 'bg-slate-100 dark:bg-slate-800'}`} role="status">{msg}</p>}
        </div>
      </div>
    </main>
  );
}
