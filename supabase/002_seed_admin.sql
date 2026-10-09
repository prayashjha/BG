-- First-admin seed
-- 1) Supabase > Authentication > Users > Add user (tick "Auto Confirm User").
-- 2) Run this once in the SQL Editor. It promotes the OLDEST profile to admin,
--    so run it before any employee signs up.
select public.promote_first_user_to_admin();
-- Verify:
select id,punch_id,email,role,status from public.profiles order by created_at;
