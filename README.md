# BGattendance

BGattendance is a mobile-first attendance PWA built with Next.js App Router, TypeScript, Tailwind CSS and Supabase. It contains an Employee App and a role-protected `/admin` panel.

## Features

- Email/password signup with required email verification and server-returned Punch ID.
- Automatic sequential numeric Punch ID using a Postgres sequence; IDs are never reused.
- Pending → approved/rejected/inactive account workflow.
- Login with email **or Punch ID**.
- Server-side GPS distance validation using Haversine distance.
- High-accuracy GPS requirement: accuracy must be 25 m or better.
- Camera-only live front-camera selfie at punch time; no gallery picker is used for punch evidence.
- One punch-in and one punch-out per day.
- Server timestamp, GPS coordinates, accuracy, distance, assigned location ID and selfie path stored with each punch.
- Basic suspicious-GPS detection (accuracy and sudden jumps) with `flagged` review state.
- Private Supabase Storage buckets and signed URLs for punch evidence.
- Employee profile photo upload (camera/gallery supported by browser file input).
- Leave application and admin approval/rejection.
- Admin dashboard, employee approval/management, location/radius management, shifts, leave approvals, welcome poster, audit log and CSV export.
- PWA manifest/service worker, HTTPS-ready camera/GPS flow, dark/light theme.

## Project structure

```text
BGattendance/
├── app/
│   ├── admin/page.tsx
│   ├── api/
│   │   ├── admin/route.ts
│   │   ├── admin/locations/route.ts
│   │   ├── admin/welcome/route.ts
│   │   ├── admin/reports/route.ts
│   │   ├── login/route.ts
│   │   ├── profile-photo/route.ts
│   │   └── punch/route.ts
│   ├── auth/callback/route.ts
│   ├── attendance/page.tsx
│   ├── forgot-password/page.tsx
│   ├── leave/page.tsx
│   ├── login/page.tsx
│   ├── more/page.tsx
│   ├── pending/page.tsx
│   ├── profile/page.tsx
│   ├── punch/page.tsx
│   ├── reset-password/page.tsx
│   ├── signup/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
├── public/
├── supabase/
│   ├── 001_init.sql
│   ├── 002_seed_admin.sql
│   └── 004_upgrade_existing_db.sql
├── .env.example
├── middleware.ts
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 1–2. Supabase and environment variables

See **DEPLOYMENT.md** (single source of truth for setup, redirect URLs and env vars).

## 3. Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Camera and GPS are normally allowed on localhost. For a real phone, use an HTTPS deployment such as Vercel. Do not test production punch flows over plain HTTP.

## 4. First admin setup

1. Create the first auth user in Supabase Authentication.
2. Confirm the email.
3. Run the seed statement from `supabase/002_seed_admin.sql`:

```sql
select public.promote_first_user_to_admin();
```

This promotes the oldest profile to admin and does not require copying a UUID or email into the project.

4. Sign in and open `/admin`.
5. Add an active office location and set its radius. The default is 20 m.
6. Create a shift if needed.
7. Approve employees and assign at least one active location.

## 5. Employee flow

1. Employee signs up.
2. Supabase sends the verification link.
3. The database trigger creates a profile and consumes the next Punch ID from `punch_id_seq`.
4. The employee verifies email and signs in.
5. Status remains `pending` until an admin approves them.
6. Admin assigns an active location and optionally a shift.
7. Employee can punch only when GPS accuracy is ≤25 m and the server-calculated distance is within the assigned location radius.
8. The live front camera captures a punch selfie. The image is uploaded to the private `punch-selfies` bucket.

## 6. Admin capabilities

- Dashboard: present/absent/pending and recent punches.
- Approvals: approve/reject pending employees and assign active locations.
- Employees: search, activate/deactivate and reset passwords.
- Locations: map click using Leaflet + OpenStreetMap, manual coordinates, radius and activation toggle.
- Reports: recent attendance and CSV export.
- Leave approvals.
- Daily welcome image/message by date.
- Shift creation with start/end and late-grace minutes.
- Audit log for admin actions performed through the supplied admin APIs.

## 7. Security model

RLS is enabled on application tables. Employees can read their own attendance/leaves/profile data. Admins can manage employees, locations, shifts, attendance, leaves and audit data.

Punch validation is deliberately server-side. The browser sends a live selfie plus GPS coordinates/accuracy to `/api/punch`; the route checks the authenticated user, approved status, assigned active locations, GPS accuracy, Haversine distance, duplicate punch rules and basic suspicious movement checks before writing the attendance record.

The browser cannot guarantee that a GPS coordinate is genuine. BGattendance does **not** claim to defeat GPS spoofing. Accuracy and sudden-jump checks are used as basic signals and suspicious punches are stored with `flagged=true` for admin review.

Signup, login and punch attempts use a Supabase-backed rate-limit table/RPC, so the limiter is shared across Vercel server instances. Supabase Auth should also remain configured with its own authentication/rate controls.

## 8. Storage

The SQL creates private buckets:

- `profile-photos`
- `punch-selfies`
- `welcome-posters`

Punch selfies are never exposed as public URLs. Admin/employee screens use signed URLs when required.

Images are limited to 5 MB by the supplied application routes. For high-security deployments, add an image-processing service to re-encode uploads and strip metadata before long-term storage.

## 9. GitHub + Vercel deployment

```bash
git init
git add .
git commit -m "Initial BGattendance build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/BGattendance.git
git push -u origin main
```

Then:

1. Open Vercel.
2. Import the GitHub repository.
3. Framework preset: Next.js.
4. Add these environment variables in Vercel for the Production environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.
6. Add the deployed Vercel URL to Supabase Authentication redirect URLs.
7. Test signup, verification, admin approval and HTTPS camera/GPS permissions on a physical phone.

## 10. Test checklist

- [ ] Sign up with name/email/password/optional phone.
- [ ] Confirm a sequential Punch ID appears after the auth profile trigger runs.
- [ ] Verify email; unverified login is rejected.
- [ ] Verify a new employee starts as `pending`.
- [ ] Admin approves the employee and assigns a location.
- [ ] Punch inside the radius with GPS accuracy ≤25 m succeeds.
- [ ] Punch outside the radius is rejected with distance shown.
- [ ] Punch with GPS accuracy >25 m is rejected.
- [ ] Punch selfie comes from the live camera flow, not a gallery picker.
- [ ] Second punch-in on the same day is rejected.
- [ ] Punch-out before punch-in is rejected.
- [ ] Punch-out after punch-in succeeds once.
- [ ] Attendance record contains server timestamp, coordinates, accuracy, distance, location ID and selfie path.
- [ ] A suspicious GPS jump sets `flagged=true`.
- [ ] Employee sees only own attendance/leaves/profile data.
- [ ] Non-admin cannot use `/admin` or admin APIs.
- [ ] Admin can approve/reject leave.
- [ ] Admin can export attendance CSV.
- [ ] Welcome image/message appears on the selected date; if no image exists for today, latest post is used.
- [ ] Location deactivation requires confirmation in the admin UI.
- [ ] PWA can be installed from a supported HTTPS browser.

## Notes before production

This repository is complete application code, but production operations still require configuring your Supabase email provider, domain/redirect URLs, Vercel environment variables, backups, monitoring and a shared rate-limit store if traffic requires multi-instance coordination.
