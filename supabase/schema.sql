-- FIFO Live — production Supabase schema
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor > New query).

create extension if not exists "uuid-ossp";

-- ---------- profiles (one row per signed-up user, linked to Supabase Auth) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'Team Member' check (role in ('Team Member','Admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
-- Anyone named exactly "Karan Sirohi" or "Yogesh Kumar" (case-insensitive) is
-- made Admin automatically; everyone else starts as Team Member.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  incoming_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  assigned_role text := 'Team Member';
begin
  if lower(trim(incoming_name)) in ('karan sirohi', 'yogesh kumar') then
    assigned_role := 'Admin';
  end if;
  insert into public.profiles (id, name, email, role)
  values (new.id, incoming_name, new.email, assigned_role);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- lots (every inward lot + its running dispatch state) ----------
create table lots (
  id uuid primary key default uuid_generate_v4(),
  lot_date date not null,
  cold_store text not null,
  sku text not null,
  importer text,
  lot_no text not null,
  box_qty numeric not null default 0,
  out_box numeric not null default 0,
  pending_box numeric not null default 0,
  inward_qty numeric not null default 0,
  out_qty numeric not null default 0,
  pending_qty numeric not null default 0,
  pv_remark text default 'Done',
  entered_by uuid references profiles(id),
  entered_by_name text,
  entered_at timestamptz not null default now(),
  exception_approved_by uuid references profiles(id),
  exception_approved_by_name text,
  exception_approved_at timestamptz
);

-- ---------- approvals (pending / decided FIFO-break dispatch requests) ----------
create table approvals (
  id uuid primary key default uuid_generate_v4(),
  lot_id uuid references lots(id) on delete cascade,
  cold_store text not null,
  sku text not null,
  lot_no text not null,
  lot_date date not null,
  out_qty numeric not null,
  out_box numeric default 0,
  requested_by uuid references profiles(id),
  requested_by_name text,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  blockers jsonb not null default '[]',
  email_sent boolean default false,
  decided_by uuid references profiles(id),
  decided_by_name text,
  decided_at timestamptz
);

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table lots enable row level security;
alter table approvals enable row level security;

create policy "profiles readable by authenticated users" on profiles
  for select using (auth.role() = 'authenticated');
create policy "users can update their own profile name" on profiles
  for update using (auth.uid() = id);

create policy "lots readable by authenticated users" on lots
  for select using (auth.role() = 'authenticated');
create policy "authenticated users can insert lots" on lots
  for insert with check (auth.role() = 'authenticated');
create policy "only admins can update lots" on lots
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'Admin'));
create policy "only admins can delete lots" on lots
  for delete using (exists (select 1 from profiles where id = auth.uid() and role = 'Admin'));

create policy "approvals readable by authenticated users" on approvals
  for select using (auth.role() = 'authenticated');
create policy "authenticated users can insert approvals" on approvals
  for insert with check (auth.role() = 'authenticated');
create policy "only admins can update approvals" on approvals
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'Admin'));

-- ---------- Realtime ----------
alter publication supabase_realtime add table lots;
alter publication supabase_realtime add table approvals;
alter publication supabase_realtime add table profiles;
