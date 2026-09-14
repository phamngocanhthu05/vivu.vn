-- ============================================================
-- Budget & expense tracking
-- Run this AFTER 0001_init.sql in the Supabase SQL editor
-- ============================================================

-- add a target budget to each trip
alter table trips add column if not exists budget numeric(12,2);
alter table trips add column if not exists currency text default 'USD';

-- ---------- expenses ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text default 'USD',
  category text default 'other',
  paid_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- ---------- expense_splits ----------
-- how much each trip member owes for a given expense
create table if not exists expense_splits (
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  amount_owed numeric(12,2) not null,
  primary key (expense_id, user_id)
);

-- ============================================================
-- Auto-split a new expense equally across all current trip members
-- ============================================================
create or replace function split_expense_equally()
returns trigger as $$
declare
  member_count int;
begin
  select count(*) into member_count
  from trip_members
  where trip_id = new.trip_id;

  if member_count > 0 then
    insert into expense_splits (expense_id, user_id, amount_owed)
    select new.id, tm.user_id, round(new.amount / member_count, 2)
    from trip_members tm
    where tm.trip_id = new.trip_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_split_expense_equally on expenses;
create trigger trg_split_expense_equally
  after insert on expenses
  for each row execute function split_expense_equally();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table expenses enable row level security;
alter table expense_splits enable row level security;

create policy "members can view expenses"
  on expenses for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "members can add expenses"
  on expenses for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
    )
    and paid_by = auth.uid()
  );

create policy "payer can delete their expense"
  on expenses for delete
  using (paid_by = auth.uid());

create policy "members can view expense splits"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses e
      join trip_members tm on tm.trip_id = e.trip_id
      where e.id = expense_splits.expense_id
      and tm.user_id = auth.uid()
    )
  );
