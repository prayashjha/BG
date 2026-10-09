# BGattendance — Setup & Deployment

## 1. Supabase
1. Create a project.
2. SQL Editor → run `supabase/001_init.sql` (new project). If you already ran an OLDER 001, run `supabase/004_upgrade_existing_db.sql` instead.
3. Authentication → Providers → Email: enable, and keep **Confirm email** ON. Add your own SMTP (e.g. Resend) before real use; the built-in mailer is heavily limited.
4. Authentication → URL Configuration:
   - Site URL: your Vercel URL
   - Redirect URLs: `http://localhost:3000/**` and `https://YOUR-DOMAIN/**`
5. Authentication → Users → **Add user** (tick *Auto Confirm User*) → this will be the admin.
6. SQL Editor → run `supabase/002_seed_admin.sql` (before any employee signs up).

## 2. Local run
```bash
cp .env.example .env.local   # fill the 3 Supabase values
npm install
npm run check                # type check
npm run dev
```

## 3. GitHub → Vercel
Push to GitHub, import in Vercel (Next.js), add the env vars from `.env.example`
(`SUPABASE_SERVICE_ROLE_KEY` only as a server variable), deploy, then add the Vercel URL in Supabase redirect URLs.

## 4. First setup in /admin
Locations → add office (radius 20 m) → Shifts → add shift → Holidays (optional) → approve employees (select location).

## 5. Smoke test
Sign up → verify email → login shows "waiting for approval" → admin approves with location → punch inside radius with selfie → punch outside radius is rejected → check Reports and CSV.

Weekly off: `NEXT_PUBLIC_WEEKLY_OFF` (0 = Sunday). Days with no punch before today count as Absent unless leave/holiday/weekly off.


## 6. Cloudflare deploy (Workers + OpenNext)
Cloudflare cannot run a Next.js app by just "importing" the repo as a static site. This repo now includes
`wrangler.jsonc`, `open-next.config.ts` and `cf:*` scripts (adapter: @opennextjs/cloudflare).

Dashboard: Workers & Pages -> Create -> Import a repository (Workers) -> pick this repo, then:
- Build command: `npm run cf:build`
- Deploy command: `npx wrangler deploy`
- Variables and Secrets (Settings): add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY (as Secret). NEXT_PUBLIC_* must also exist at BUILD time (Build -> Variables).
- Node version: set build variable NODE_VERSION=22 (wrangler 4 needs Node 22 or higher).

CLI alternative: copy `.dev.vars.example` to `.dev.vars`, fill it, then `npm install`, `npm run cf:deploy`.

## 7. Login not working? Check in this order
1. Open `https://YOUR-SITE/api/health` -> must show env_ok true and database_functions_ok true.
2. NEXT_PUBLIC_* values are baked in at build time: after adding/changing env vars, REDEPLOY.
3. Drag-and-drop deploys do not include `.env.local`: add the variables in the host dashboard.
4. Supabase -> Authentication -> URL Configuration: Site URL = your live URL, Redirect URLs = `https://YOUR-SITE/**`.
5. Run `supabase/001_init.sql` (fresh project) and create the admin user (Auto Confirm) + `002_seed_admin.sql`.
6. Too many attempts? Wait 15 min, or in SQL Editor run: `delete from public.rate_limit_events;`
