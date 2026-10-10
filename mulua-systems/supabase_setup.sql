-- MIROX SHARED SYSTEM DATABASE SETUP
-- Run this entire script in Supabase: SQL Editor -> New query -> Run.
-- The script uses Row Level Security (RLS). Do not disable RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null default 'investigator' check (role in ('admin', 'investigator')),
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  file_no text not null unique,
  insured text not null,
  description text default '',
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  investigator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (file_id, investigator_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  expense_date date not null default current_date,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_assigned_to_file(target_file uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments
    where file_id = target_file and investigator_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.assignments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Profiles readable by signed in users" on public.profiles;
create policy "Profiles readable by signed in users" on public.profiles
for select to authenticated using (true);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Files visible to admin or assigned investigator" on public.files;
create policy "Files visible to admin or assigned investigator" on public.files
for select to authenticated using (public.is_admin() or public.is_assigned_to_file(id));

drop policy if exists "Admins manage files" on public.files;
create policy "Admins manage files" on public.files
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Assignments readable by authorized users" on public.assignments;
create policy "Assignments readable by authorized users" on public.assignments
for select to authenticated using (public.is_admin() or investigator_id = auth.uid());

drop policy if exists "Admins manage assignments" on public.assignments;
create policy "Admins manage assignments" on public.assignments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Expenses readable by admin or assigned investigator" on public.expenses;
create policy "Expenses readable by admin or assigned investigator" on public.expenses
for select to authenticated using (public.is_admin() or public.is_assigned_to_file(file_id));

drop policy if exists "Investigators add expenses to assigned open files" on public.expenses;
create policy "Investigators add expenses to assigned open files" on public.expenses
for insert to authenticated with check (
  created_by = auth.uid()
  and public.is_assigned_to_file(file_id)
  and exists (select 1 from public.files f where f.id = file_id and f.status = 'Open')
);

drop policy if exists "Expense owner or admin updates expenses" on public.expenses;
create policy "Expense owner or admin updates expenses" on public.expenses
for update to authenticated
using (
  public.is_admin() or (
    created_by = auth.uid()
    and public.is_assigned_to_file(file_id)
    and exists (select 1 from public.files f where f.id = file_id and f.status = 'Open')
  )
)
with check (
  public.is_admin() or (
    created_by = auth.uid()
    and public.is_assigned_to_file(file_id)
    and exists (select 1 from public.files f where f.id = file_id and f.status = 'Open')
  )
);

drop policy if exists "Expense owner or admin deletes expenses" on public.expenses;
create policy "Expense owner or admin deletes expenses" on public.expenses
for delete to authenticated using (public.is_admin() or created_by = auth.uid());
