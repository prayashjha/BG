'use client';
import { LogOut } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function SignOutButton() {
  return (
    <button
      onClick={async () => { await supabaseBrowser().auth.signOut(); location.href = '/login'; }}
      className="tap mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border py-3"
    >
      <LogOut size={18} /> Sign out
    </button>
  );
}
