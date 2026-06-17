-- =============================================================
-- Finance Tracker — database schema + Row Level Security
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- =============================================================

-- ---------- Tables ----------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  icon        text not null default 'circle',
  created_at  timestamptz not null default now()
);

create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  category_id         uuid references public.categories (id) on delete set null,
  amount              numeric(12, 2) not null check (amount >= 0),
  type                text not null check (type in ('income', 'expense')),
  date                date not null default current_date,
  note                text,
  is_recurring        boolean not null default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  created_at          timestamptz not null default now()
);

create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount >= 0),
  period      text not null default 'monthly' check (period in ('monthly')),
  created_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  target_amount  numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  deadline       date,
  created_at     timestamptz not null default now()
);

-- Helpful indexes
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists categories_user_idx on public.categories (user_id);
create index if not exists budgets_user_idx on public.budgets (user_id);
create index if not exists goals_user_idx on public.goals (user_id);

-- Enforce "one budget per category" and "one overall budget" per user.
-- Two partial indexes are required because NULL category_id (the overall
-- budget) is treated as distinct by a plain UNIQUE constraint.
create unique index if not exists budgets_user_category_unique
  on public.budgets (user_id, category_id) where category_id is not null;
create unique index if not exists budgets_user_overall_unique
  on public.budgets (user_id) where category_id is null;

-- ---------- Row Level Security ----------
-- Every table is locked down so a user can only read/write their own rows.

alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.goals        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'goals']
  loop
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);

    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------- Default categories on signup ----------
-- When a new user is created, seed a handful of starter categories.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, name, color, icon) values
    (new.id, 'Salary',        '#22c55e', 'wallet'),
    (new.id, 'Food',          '#f97316', 'utensils'),
    (new.id, 'Rent',          '#ef4444', 'home'),
    (new.id, 'Transport',     '#3b82f6', 'car'),
    (new.id, 'Entertainment', '#a855f7', 'film'),
    (new.id, 'Shopping',      '#ec4899', 'shopping-bag'),
    (new.id, 'Health',        '#14b8a6', 'heart-pulse'),
    (new.id, 'Other',         '#64748b', 'circle');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Atomic mutations ----------
-- These run as `security invoker`, so RLS and auth.uid() still apply.

-- Add to a goal's balance in a single statement — no read-modify-write race,
-- and the client can't set an arbitrary balance.
create or replace function public.increment_goal(p_goal_id uuid, p_amount numeric)
returns void
language plpgsql
security invoker
as $$
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  update public.goals
     set current_amount = current_amount + p_amount
   where id = p_goal_id and user_id = auth.uid();
end $$;

-- Upsert a budget for the current user, treating a null category (the overall
-- budget) as a single slot. An amount of 0 removes the budget. Atomic, so two
-- concurrent saves can't leave the table in a half-updated state.
create or replace function public.set_budget(p_category_id uuid, p_amount numeric)
returns void
language plpgsql
security invoker
as $$
begin
  if p_amount <= 0 then
    delete from public.budgets
     where user_id = auth.uid()
       and category_id is not distinct from p_category_id;
    return;
  end if;

  update public.budgets
     set amount = p_amount, period = 'monthly'
   where user_id = auth.uid()
     and category_id is not distinct from p_category_id;

  if not found then
    insert into public.budgets (user_id, category_id, amount, period)
    values (auth.uid(), p_category_id, p_amount, 'monthly');
  end if;
end $$;

-- ---------- Grants ----------
-- RLS only *filters rows* — it does not grant table access. The role PostgREST
-- uses for logged-in requests (`authenticated`) still needs table privileges.
-- Tables created by the `postgres` role (as happens during `supabase db reset`
-- / migrations) do NOT inherit these automatically, so grant them explicitly.
-- Every row stays protected by the owner_* RLS policies above.
grant select, insert, update, delete
  on public.categories, public.transactions, public.budgets, public.goals
  to authenticated;

grant execute on function public.increment_goal(uuid, numeric) to authenticated;
grant execute on function public.set_budget(uuid, numeric)      to authenticated;
