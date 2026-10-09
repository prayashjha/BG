'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

type Props = { lat: number; lng: number; radius: number; onPick: (a: { lat: number; lng: number }) => void };

export default function AdminMap({ lat, lng, radius, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef<{ map?: any; marker?: any; circle?: any }>({});
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = await import('leaflet');
      if (dead || !ref.current) return;
      const c: [number, number] = [lat || 28.6139, lng || 77.209];
      const map = L.map(ref.current).setView(c, 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      // circleMarker instead of the default pin: the default pin images 404 when bundled with Next.js
      const marker = L.circleMarker(c, { radius: 7, color: '#fff', weight: 2, fillColor: '#18A66A', fillOpacity: 1 }).addTo(map);
      const circle = L.circle(c, { radius: radius || 20, color: '#18A66A', fillOpacity: 0.15 }).addTo(map);
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng); circle.setLatLng(e.latlng);
        pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      state.current = { map, marker, circle };
    })();
    return () => { dead = true; state.current.map?.remove(); state.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the map in sync when lat/lng/radius are typed in or "use my location" is pressed
  useEffect(() => {
    const { map, marker, circle } = state.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    marker.setLatLng([lat, lng]); circle.setLatLng([lat, lng]);
    circle.setRadius(Math.max(1, radius || 1));
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng]);
  }, [lat, lng, radius]);

  return <div ref={ref} className="mt-3 h-64 w-full overflow-hidden rounded-2xl" />;
}
