import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { Logo } from '@/components/ui';
import SignOutButton from '@/components/signout-button';

export default async function Pending() {
  const { profile } = await requireProfile();
  if (profile.role === 'admin') redirect('/admin');
  if (profile.status === 'approved') redirect('/');

  const msg: Record<string, [string, string, string]> = {
    pending: ['⏳', 'Waiting for admin approval', 'Once an admin approves your account and assigns a location, punching will be enabled.'],
    rejected: ['🚫', 'Account not approved', 'Your request was not approved. Please contact your admin.'],
    inactive: ['⏸️', 'Account deactivated', 'Your account is currently inactive. Please contact your admin.'],
  };
  const [icon, title, text] = msg[profile.status] || msg.pending;
  return (
    <main className="grid min-h-screen place-items-center p-3">
      <div className="card w-full max-w-md p-7 text-center">
        <div className="flex justify-center"><Logo /></div>
        <div className="mx-auto mt-8 grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-3xl">{icon}</div>
        <h1 className="mt-5 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Hi {profile.name}, your Punch ID is <b>{profile.punch_id}</b>. {text}</p>
        <SignOutButton />
      </div>
    </main>
  );
}
