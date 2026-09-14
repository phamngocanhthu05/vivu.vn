-- ============================================================
-- Itinerary planner: initial schema (trips, membership, activities)
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- trips ----------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  owner_id uuid references auth.users not null,
  created_at timestamptz default now()
);

-- ---------- trip_members ----------
create table if not exists trip_members (
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- ---------- activities ----------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_date date not null,
  title text not null,
  start_time time,
  lat float8,
  lng float8,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- Auto-add the creator of a trip as its owner in trip_members
-- ============================================================
create or replace function add_owner_as_member()
returns trigger as $$
begin
  insert into trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_add_owner_as_member on trips;
create trigger trg_add_owner_as_member
  after insert on trips
  for each row execute function add_owner_as_member();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table activities enable row level security;

-- trips: a user can see/edit trips they belong to
create policy "members can view trips"
  on trips for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "authenticated users can create trips"
  on trips for insert
  with check (owner_id = auth.uid());

create policy "owners can update their trips"
  on trips for update
  using (owner_id = auth.uid());

create policy "owners can delete their trips"
  on trips for delete
  using (owner_id = auth.uid());

-- trip_members: members can see who else is on the trip
create policy "members can view trip membership"
  on trip_members for select
  using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
      and tm.user_id = auth.uid()
    )
  );

-- activities: members can view; editors/owners can write
create policy "members can view activities"
  on activities for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = activities.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "editors can insert activities"
  on activities for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = activities.trip_id
      and trip_members.user_id = auth.uid()
      and trip_members.role in ('owner', 'editor')
    )
  );

create policy "editors can update activities"
  on activities for update
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = activities.trip_id
      and trip_members.user_id = auth.uid()
      and trip_members.role in ('owner', 'editor')
    )
  );

create policy "editors can delete activities"
  on activities for delete
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = activities.trip_id
      and trip_members.user_id = auth.uid()
      and trip_members.role in ('owner', 'editor')
    )
  );
