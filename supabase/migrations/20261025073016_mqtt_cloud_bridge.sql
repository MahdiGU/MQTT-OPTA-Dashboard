-- MQTT-to-Supabase bridge foundation.
-- EMQX writes through the ingest-mqtt Edge Function. Authenticated clients
-- can read the latest state and command audit log, but cannot forge either.

alter table public.telemetry
  add column if not exists ingest_bucket timestamptz;

create unique index if not exists telemetry_ingest_bucket_unique
  on public.telemetry (farm_id, device_id, ingest_bucket);

create table if not exists public.device_latest (
  farm_id uuid not null references public.farms(id) on delete cascade,
  device_id text not null,
  mqtt_status text not null default 'unknown'
    check (mqtt_status in ('online', 'offline', 'unknown')),
  received_at timestamptz not null default now(),
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
  l0 boolean,
  l1 boolean,
  l2 boolean,
  l3 boolean,
  i2 boolean,
  i3 boolean,
  i4 boolean,
  i5 boolean,
  i6 boolean,
  i7 boolean,
  i8 boolean,
  raw_payload jsonb,
  updated_at timestamptz not null default now(),
  primary key (farm_id, device_id)
);

create index if not exists device_latest_farm_received_idx
  on public.device_latest (farm_id, received_at desc);

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  topic text not null default 'opta/cmd',
  payload text not null check (length(payload) between 1 and 64),
  qos smallint not null default 0 check (qos = 0),
  retain boolean not null default false check (retain = false),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'acknowledged')),
  broker_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists device_commands_farm_created_idx
  on public.device_commands (farm_id, created_at desc);

drop trigger if exists device_latest_updated_at on public.device_latest;
create trigger device_latest_updated_at
before update on public.device_latest
for each row execute function private.set_updated_at();

drop trigger if exists device_commands_updated_at on public.device_commands;
create trigger device_commands_updated_at
before update on public.device_commands
for each row execute function private.set_updated_at();

alter table public.device_latest enable row level security;
alter table public.device_commands enable row level security;

revoke all on public.device_latest, public.device_commands from anon, authenticated;
grant select on public.device_latest, public.device_commands to authenticated;

drop policy if exists device_latest_select_member on public.device_latest;
create policy device_latest_select_member on public.device_latest
for select to authenticated
using (private.is_farm_member(farm_id));

drop policy if exists device_commands_select_member on public.device_commands;
create policy device_commands_select_member on public.device_commands
for select to authenticated
using (private.is_farm_member(farm_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'device_latest'
  ) then
    alter publication supabase_realtime add table public.device_latest;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'device_commands'
  ) then
    alter publication supabase_realtime add table public.device_commands;
  end if;
end
$$;
