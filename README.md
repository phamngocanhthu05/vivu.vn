# vivu.vn — Itinerary & Budget Planner

Hệ thống thiết kế và quản lý lịch trình du lịch cho cá nhân, gia đình và doanh nghiệp.

vivu.vn lets a group plan a trip day by day, see stops on a map with an auto-generated route, split expenses however they like (equally or custom amounts), invite people who don't have an account, and export the plan as a PDF or add it to a calendar.

## Run it locally

1. Download the .zip file
2. Extract
3. **Install dependencies and run**:
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000` — you'll land on the login page. Enter an email to get a magic sign-in link (email auth is enabled by default in Supabase Auth settings).

## What's here

- `app/login` — magic-link sign in
- `app/trips` — list of trips you belong to, "new trip" button
- `app/trips/new` — create a trip
- `app/trips/[id]` — trip detail: activities grouped by day, map with route between that day's stops, edit/delete trip, PDF and calendar (`.ics`) export
- `app/trips/[id]/budget` — spent vs. budget progress bar, add/remove expenses, choose who each expense is split with (equal or custom amounts), per-person balances
- `app/api/geocode` — server route that proxies place lookups (used by the map) so the client never calls Nominatim directly
- `lib/supabaseClient.js` — the Supabase client, shared everywhere
- `supabase/migrations/` — schema + RLS, applied in order

## Features

### Itinerary + map
Activities are grouped by day. Each day's stops are geocoded and plotted on a map (MapLibre + OpenFreeMap tiles), with a driving route drawn between them in order, and a click-to-edit popup on each marker.

### Budget with custom splits
Adding an expense lets you pick exactly who it's shared with — check the people involved, then either split the amount evenly across them or type an exact amount per person (validated to add up to the total). Balances are computed per person as (what they've paid) minus (what they owe across all splits).

### Guest members (people without an account)
Not everyone on a trip needs to sign up. You can add a person by name only — they get a placeholder ID and a `trip_members` row with `role = 'viewer'`, and can then be picked as a participant in any expense split, or as who paid. This required a few schema changes from the original scaffold:
- `trip_members.name` (text) stores the guest's display name directly, since they have no `profiles`/`auth.users` row to join against.
- The `auth.users` foreign keys on `trip_members.user_id`, `expenses.paid_by`, and `expense_splits.user_id` were dropped, since guest IDs don't correspond to real auth accounts.
- RLS insert policies on `trip_members` and `expense_splits` were changed from "you can only insert your own user_id" to "any existing member of this trip can insert a row for this trip," so one signed-in member can add guests and assign them splits on everyone's behalf.

### Export
- **PDF** (`jspdf`) — a day-by-day itinerary export from the trip page.
- **Calendar (.ics)** — one event per activity, downloadable and importable into any calendar app. Dates/times are normalized defensively before conversion, since `day_date`/`start_time` can arrive in slightly different shapes depending on how a row was created.

## Not yet built

- Public read-only share links
- Realtime collaboration (Supabase Realtime subscriptions on `activities`)
- A full `profiles` table for real member avatars/emails (currently only guest names are stored directly; signed-in members without a `profiles` row still show as a shortened ID)
- Currency conversion, offline caching, bookings
- Styling/print layout for the PDF export beyond plain text

## Notes

- Auth uses Supabase's magic-link (OTP) flow — no passwords to manage. Swap in `signInWithPassword` or OAuth providers later if you want.
- RLS policies mean a user can only see/edit trips they're a member of — enforced at the database level, not just in the UI. Because guests are now part of that model, double-check any new RLS policy you add checks "is a member of this trip," not "is this row's own user_id," or guest-related actions will silently fail.
- The trigger `add_owner_as_member` automatically adds you as the `owner` in `trip_members` whenever you create a trip.
- The original equal-split trigger (`split_expense_equally`) has been superseded by explicit app-side split inserts (see [Budget with custom splits](#budget-with-custom-splits)) — if your database still has that trigger, drop it, or every expense will get duplicate split rows.
