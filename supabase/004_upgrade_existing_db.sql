-- Run ONLY if you already ran an OLDER 001_init.sql. New installs do not need this file.
-- Safe to run more than once.
alter table public.rate_limit_events enable row level security;

create table if not exists public.holidays(date date primary key,name text not null,created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now());
alter table public.holidays enable row level security;
drop policy if exists holidays_read on public.holidays;drop policy if exists holidays_admin on public.holidays;
create policy holidays_read on public.holidays for select using(auth.uid() is not null);
create policy holidays_admin on public.holidays for all using(public.is_admin()) with check(public.is_admin());

drop policy if exists leaves_insert_self on public.leaves;
create policy leaves_insert_self on public.leaves for insert with check(user_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists storage_welcome_read on storage.objects;
create policy storage_welcome_read on storage.objects for select to authenticated using(bucket_id='welcome-posters');

create or replace function public.dashboard_counts(p_date date) returns table(present bigint,absent bigint,late bigint,pending bigint) language sql security definer set search_path=public as $$select (select count(*) from attendance where date=p_date and punch_in is not null),(select count(*) from profiles p where p.role='employee' and p.status='approved' and not exists(select 1 from attendance a where a.user_id=p.id and a.date=p_date and a.punch_in is not null)),(select count(*) from attendance a join profiles p on p.id=a.user_id join shifts s on s.id=p.shift_id where a.date=p_date and a.punch_in is not null and (a.punch_in at time zone 'Asia/Kolkata')::time > (s.start_time + make_interval(mins=>s.grace_minutes))),(select count(*) from profiles where status='pending');$$;
revoke all on function public.dashboard_counts(date) from public,anon,authenticated;grant execute on function public.dashboard_counts(date) to service_role;
