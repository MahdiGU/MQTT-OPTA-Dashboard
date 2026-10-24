-- ElMajd Automation shared cloud database.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.farms (slug, name)
values ('elmajd-poultry', 'ElMajd Poultry')
on conflict (slug) do update set name = excluded.name;

create table if not exists public.farm_members (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'worker', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  mqtt_client_id text not null unique,
  name text not null default 'Arduino Opta',
  created_at timestamptz not null default now()
);

create table if not exists public.telemetry (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  device_id text not null,
  recorded_at timestamptz not null default now(),
  seq bigint,
  up_s bigint,
  rssi integer,
  volts double precision,
  temp_c double precision,
  sensor_fault boolean,
  d0 boolean,
  d1 boolean,
  d2 boolean,
  d3 boolean,
  i2 boolean,
  i3 boolean,
  i4 boolean,
  i5 boolean,
  i6 boolean,
  i7 boolean,
  i8 boolean,
  raw_payload jsonb
);

create index if not exists telemetry_farm_time_idx
  on public.telemetry (farm_id, recorded_at desc);
create index if not exists telemetry_device_time_idx
  on public.telemetry (device_id, recorded_at desc);

create table if not exists public.daily_production (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  production_date date not null,
  eggs integer not null check (eggs >= 0),
  mortality integer not null check (mortality >= 0),
  production_rate numeric(5,2) not null check (production_rate between 0 and 100),
  submitted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, production_date)
);

create index if not exists daily_production_farm_date_idx
  on public.daily_production (farm_id, production_date desc);

create or replace function private.is_farm_member(target_farm uuid)
returns boolean language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm and user_id = (select auth.uid())
  )
$$;

create or replace function private.has_farm_role(target_farm uuid, allowed_roles text[])
returns boolean language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
  )
$$;

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists daily_production_updated_at on public.daily_production;
create trigger daily_production_updated_at
before update on public.daily_production
for each row execute function private.set_updated_at();

alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.devices enable row level security;
alter table public.telemetry enable row level security;
alter table public.daily_production enable row level security;

revoke all on public.farms, public.farm_members, public.devices, public.telemetry, public.daily_production
  from anon, authenticated;
grant select on public.farms, public.farm_members, public.devices to authenticated;
grant select, insert on public.telemetry to authenticated;
grant select, insert, update on public.daily_production to authenticated;
grant usage, select on sequence public.telemetry_id_seq, public.daily_production_id_seq to authenticated;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_farm_member(uuid) to authenticated;
grant execute on function private.has_farm_role(uuid, text[]) to authenticated;

drop policy if exists farms_select_member on public.farms;
create policy farms_select_member on public.farms for select to authenticated
using (private.is_farm_member(id));

drop policy if exists memberships_select_own on public.farm_members;
create policy memberships_select_own on public.farm_members for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists devices_select_member on public.devices;
create policy devices_select_member on public.devices for select to authenticated
using (private.is_farm_member(farm_id));

drop policy if exists telemetry_select_member on public.telemetry;
create policy telemetry_select_member on public.telemetry for select to authenticated
using (private.is_farm_member(farm_id));

drop policy if exists telemetry_insert_staff on public.telemetry;
create policy telemetry_insert_staff on public.telemetry for insert to authenticated
with check (private.has_farm_role(farm_id, array['owner','manager','worker']));

drop policy if exists production_select_member on public.daily_production;
create policy production_select_member on public.daily_production for select to authenticated
using (private.is_farm_member(farm_id));

drop policy if exists production_insert_staff on public.daily_production;
create policy production_insert_staff on public.daily_production for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.has_farm_role(farm_id, array['owner','manager','worker'])
);

drop policy if exists production_update_management on public.daily_production;
create policy production_update_management on public.daily_production for update to authenticated
using (private.has_farm_role(farm_id, array['owner','manager']))
with check (private.has_farm_role(farm_id, array['owner','manager']));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_production'
  ) then
    alter publication supabase_realtime add table public.daily_production;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'telemetry'
  ) then
    alter publication supabase_realtime add table public.telemetry;
  end if;
end
$$;
