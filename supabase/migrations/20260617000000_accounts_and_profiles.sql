-- =============================================================
-- Accounts (manual-balance wallets) + Profiles (per-user prefs)
-- Additive migration — keep in sync with supabase/schema.sql.
-- =============================================================

-- ---------- Tables ----------

-- balance has no >= 0 check on purpose — a credit card can be negative.
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null default 'checking'
              check (type in ('checking', 'savings', 'cash', 'credit', 'investment')),
  balance     numeric(12, 2) not null default 0,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency     text not null default 'USD',
  created_at   timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts (user_id);

-- ---------- Row Level Security ----------

alter table public.accounts enable row level security;
alter table public.profiles enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'profiles']
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

-- ---------- Seed a profile row on signup ----------
-- Re-declare handle_new_user so new users also get a profiles row.

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
  insert into public.profiles (user_id) values (new.id);
  return new;
end $$;

-- ---------- Grants ----------

grant select, insert, update, delete
  on public.accounts, public.profiles
  to authenticated;
