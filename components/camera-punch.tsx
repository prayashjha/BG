'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, MapPin } from 'lucide-react';

export type PunchCapture = { blob: Blob; lat: number; lng: number; accuracy: number };

export default function CameraPunch({ mode, onDone }: { mode: 'in' | 'out'; onDone: (r: PunchCapture) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('Requesting camera…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
        // React dev mode mounts twice; without this the first camera stream was never released.
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (video.current) { video.current.srcObject = s; await video.current.play(); }
        setReady(true);
        setMsg('Ready — capture live selfie');
      } catch {
        if (!cancelled) setMsg('Camera permission is required for punching in/out.');
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, []);

  const capture = async () => {
    if (!video.current || !canvas.current || busy) return;
    setBusy(true);
    try {
      const w = video.current.videoWidth, h = video.current.videoHeight;
      if (!w || !h) throw new Error('camera');
      canvas.current.width = w; canvas.current.height = h;
      canvas.current.getContext('2d')!.drawImage(video.current, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) => canvas.current!.toBlob(res, 'image/jpeg', 0.86));
      if (!blob) throw new Error('blob');
      setMsg('Getting high-accuracy GPS…');
      const loc = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
      onDone({ blob, lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy });
    } catch {
      setMsg('GPS permission/fix failed. Please retry in an open area.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
        <div className="absolute bottom-3 left-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{msg}</div>
      </div>
      <canvas ref={canvas} className="hidden" />
      <button onClick={capture} disabled={!ready || busy} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-green py-4 font-semibold text-white disabled:opacity-50">
        <Camera /> Capture &amp; Punch {mode === 'in' ? 'In' : 'Out'}
      </button>
      <p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={14} /> Live front-camera selfie + high-accuracy GPS.</p>
    </div>
  );
}
