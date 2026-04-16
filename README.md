# Rapid Wrench App

Phone-first Next.js + Supabase scaffold for the Rapid Wrench field app.

## Stack
- Next.js App Router
- React
- Tailwind CSS
- Supabase Auth, Database, and Storage
- TypeScript

## Getting started
1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase values.
3. Run the Supabase SQL schema in your project.
4. Generate table types:
   - `npm run db:types`
5. Start the app:
   - `npm run dev`

## Suggested first milestones
- wire customer CRUD
- wire vehicle CRUD
- wire job CRUD
- add payments
- add docs and signatures

## Project structure
- `src/app` routes and layouts
- `src/components` shared UI and page sections
- `src/lib/supabase` browser/server/proxy utilities
- `src/lib/actions` server actions
- `src/lib/validators` zod schemas
- `src/types/database.types.ts` generated Supabase types


## Supabase migration

The initial database migration is included at:

- `supabase/migrations/20260415_rapid_wrench_initial.sql`

Run it in the Supabase SQL editor or through your migration workflow before using the protected CRUD pages.

## First wired page

The first real CRUD slice is now:

- `/customers`

It includes:

- create customer
- list customers
- inline update
- delete customer
- call, text, and email quick actions


## Second wired page

The second real CRUD slice is now:

- `/vehicles`

It includes:

- create vehicle
- list vehicles
- inline update
- delete vehicle
- customer linking
- VIN, mileage, plate, color, and notes
- vehicle overview shown on `/people`

## Third wired page

The third real CRUD slice is now:

- `/jobs`

It includes:

- create job
- list jobs
- inline update
- delete job
- customer and vehicle linking
- status tracking
- labor, parts, deposit, and balance display
- optional initial deposit payment creation
- call and text quick actions


## Fourth wired page

The fourth real CRUD slice is now:

- `/payments`

It includes:

- create payment
- list payments
- inline update
- delete payment
- automatic job balance recalculation via database trigger
- payment method and note tracking
- home screen totals wired from jobs + payments


## Fifth wired feature

Job photo upload is now wired into:

- `/jobs`

It includes:

- upload image files to the `job-photos` Supabase Storage bucket
- save `job_photos` metadata rows
- signed URL preview for private images
- optional photo captions
- delete photo flow that removes both the storage object and database row


## Docs flow

The `/docs` page now supports:
- creating or reusing invoice/agreement records
- capturing a signature and saving it to the private `signatures` bucket
- generating a PDF client-side from the document preview
- uploading the saved PDF to the private `documents` bucket
- sharing or downloading the PDF from a phone

Important note: the docs page uses browser PDF generation (`html2canvas` + `jspdf`) and then uploads the resulting file through a server action.


## Diagnostics flow

The `/diagnostics` page now supports:
- creating real diagnostic entries tied to jobs
- saving symptom and OBD2 code notes
- storing likely causes and suggested tests as JSON arrays
- updating and deleting saved diagnostic history
- quick reference cards that prefill the create form for common symptoms and codes


## Settings + Home polish

This package adds:
- a real `/settings` page backed by `profiles` and `business_settings`
- server actions for updating business profile and paperwork defaults
- a richer home dashboard with:
  - business name and service area from settings
  - active job count
  - saved customer count
  - saved vehicle count
  - recent jobs
  - recent payments
  - easier links to People and Settings

## Auth is now wired

This package now includes real Supabase email/password auth:
- `/login` sign-in form
- account creation form
- protected layout for app routes
- logout action in the app header
- root dashboard redirects to login when no session exists

Before signing in, make sure Supabase Auth is enabled for email/password in your project settings.

## UI cleanup pass

This package also adds a broader mobile polish pass:
- stronger app shell styling
- active bottom navigation state
- cleaner login screen
- shared UI primitives for buttons, form fields, stats, and empty states
- refreshed home dashboard cards and quick actions
- cleaner Customers and Jobs pages for one-handed phone use


## Offline + PWA pass

This package adds a first install/offline pass:
- `src/app/manifest.ts` for the web app manifest
- generated app icons via `src/app/icon.tsx` and `src/app/apple-icon.tsx`
- `public/sw.js` service worker for cached app shell + offline fallback
- `src/app/offline/page.tsx` offline fallback screen
- `src/components/pwa/pwa-provider.tsx` for:
  - service worker registration
  - install prompt UI
  - offline status banner

Important notes:
- the service worker registers only in production builds
- the app shell and previously visited pages can reopen offline
- live Supabase reads, writes, and uploads still need a connection unless you add deeper offline queue/sync logic later


## Mobile release path

For this codebase, the fastest real iPhone + Android release is the built-in PWA flow:

1. deploy to Vercel
2. connect Supabase in production
3. open the production URL on the phone
4. install to the home screen

This project already includes:
- a manifest
- app icons
- a service worker
- an offline fallback page
- an install helper route at `/install`

There is also a top-level `MOBILE-LAUNCH.md` file with the recommended phone-launch path.


## Appointments and scheduling

This scaffold now includes:
- service types with duration
- weekly availability rules
- blocked time
- owner-made appointments
- public booking page at `/book/[slug]`

### Extra environment variable
The public booking flow uses a server-only admin client for secure booking inserts. Add this to `.env.local` and Vercel:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

### Database update
Re-run the updated SQL migration to add:
- `service_types`
- `availability_rules`
- `blocked_times`
- `appointments`
- `profiles.booking_slug`
