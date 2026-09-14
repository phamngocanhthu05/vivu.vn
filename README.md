# Itinerary planner — starter scaffold

Covers steps 1–4 from the build plan: project setup, database schema, auth, and trip CRUD.

## Setup

1. **Create a Supabase project** at supabase.com (free tier).
2. **Run the migrations, in order**: open the SQL editor in your Supabase dashboard.
   - Paste in `supabase/migrations/0001_init.sql` and run it. This creates `trips`, `trip_members`, `activities`, and the row-level security policies.
   - Then paste in `supabase/migrations/0002_add_budget.sql` and run it. This adds a `budget`/`currency` field to trips and creates `expenses` + `expense_splits`, plus a trigger that auto-splits each new expense equally across all trip members.
3. **Copy your keys**: Project Settings → API → copy the Project URL and anon public key.
4. **Configure env vars**: copy `.env.local.example` to `.env.local` and fill in your Supabase URL and anon key.
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
6. Open `http://localhost:3000` — you'll land on the login page. Enter an email to get a magic sign-in link (make sure email auth is enabled in Supabase Auth settings, it is by default).

## What's here

- `app/login` — magic-link sign in
- `app/trips` — list of trips you belong to, "new trip" button
- `app/trips/new` — create a trip
- `app/trips/[id]` — trip detail: activities grouped by day, add/remove activities
- `app/trips/[id]/budget` — spent vs. budget progress bar, per-person balances, add/remove expenses
- `lib/supabaseClient.js` — the Supabase client, shared everywhere
- `supabase/migrations/0001_init.sql` — trips/members/activities schema + RLS
- `supabase/migrations/0002_add_budget.sql` — budget field + expenses/expense_splits + RLS

## How the budget feature works

- Each trip can have an optional `budget` and `currency` (set directly in the `trips` table for now — no UI field yet, add one if you want it editable from the app).
- Adding an expense inserts a row into `expenses` with `paid_by` set to whoever is logged in.
- A database trigger (`split_expense_equally`) automatically creates one `expense_splits` row per trip member, splitting the amount evenly. This runs in Postgres, not in the app, so it stays consistent no matter what client creates the expense.
- The budget page computes each member's balance as (what they've paid) minus (what they owe across all splits) — positive means they're owed money, negative means they owe.
- Member names currently show as a shortened user ID rather than an email/name, since `auth.users` isn't queryable from the client. To show real names, add a `profiles` table (id, display_name) populated via a trigger on user signup, and join against it.

## Not yet built (next steps from the plan)

- Map view of activities (Mapbox/Google Maps)
- Public read-only share links
- Realtime collaboration (Supabase Realtime subscriptions on `activities`)
- A `profiles` table for real member names/avatars instead of raw user IDs
- Unequal/custom expense splits (currently always equal)
- PDF export, offline caching, currency conversion, bookings

## Notes

- Auth uses Supabase's magic-link (OTP) flow — no passwords to manage. Swap in `signInWithPassword` or OAuth providers later if you want.
- RLS policies mean a user can only see/edit trips they're a member of — this is enforced at the database level, not just in the UI.
- The trigger `add_owner_as_member` automatically adds you as the `owner` in `trip_members` whenever you create a trip, so you don't need extra client-side code for that.
