import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase-server';

export async function currentUser() {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  return user;
}
export async function requireProfile() {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await s.from('profiles').select('*').eq('id', user.id).single();
  if (!p) redirect('/login');
  return { user, profile: p };
}
export async function requireAdmin() {
  const x = await requireProfile();
  if (x.profile.role !== 'admin' || x.profile.status !== 'approved') redirect('/');
  return x;
}
/** Approved employee only; everyone else is sent to the right screen. */
export async function requireEmployee() {
  const x = await requireProfile();
  if (x.profile.role === 'admin') redirect('/admin');
  if (x.profile.status !== 'approved') redirect('/pending');
  return x;
}
