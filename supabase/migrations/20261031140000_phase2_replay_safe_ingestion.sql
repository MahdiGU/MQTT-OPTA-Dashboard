-- Phase 2: registered device identity, replay-safe raw telemetry, source time,
-- conditional latest-state updates and five-minute aggregate foundations.

create table if not exists public.poultry_houses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  slug text not null,
  name text not null,
  business_timezone text not null default 'UTC+01:00',
  created_at timestamptz not null default now(),
  unique (farm_id, slug)
);

alter table public.poultry_houses enable row level security;
revoke all on public.poultry_houses from anon, authenticated;
grant select on public.poultry_houses to authenticated;

drop policy if exists poultry_houses_select_member on public.poultry_houses;
create policy poultry_houses_select_member on public.poultry_houses
for select to authenticated
using (private.is_farm_member(farm_id));

insert into public.poultry_houses (farm_id, slug, name)
select id, 'house-01', 'Pilot Poultry House'
from public.farms
where slug = 'elmajd-poultry'
on conflict (farm_id, slug) do update set name = excluded.name;

alter table public.devices
  add column if not exists house_id uuid references public.poultry_houses(id) on delete set null,
  add column if not exists telemetry_topic text not null default 'opta/outputs',
  add column if not exists status_topic text not null default 'opta/status',
  add column if not exists command_topic text not null default 'opta/cmd',
  add column if not exists enabled boolean not null default true,
  add column if not exists firmware_version text,
  add column if not exists last_seen_at timestamptz;

create index if not exists devices_farm_idx on public.devices (farm_id);
create index if not exists devices_house_idx on public.devices (house_id);

insert into public.devices (
  farm_id, house_id, mqtt_client_id, name,
  telemetry_topic, status_topic, command_topic, enabled
)
select f.id, h.id, 'opta-control-01', 'Pilot Arduino Opta',
       'opta/outputs', 'opta/status', 'opta/cmd', true
from public.farms f
join public.poultry_houses h on h.farm_id = f.id and h.slug = 'house-01'
where f.slug = 'elmajd-poultry'
on conflict (mqtt_client_id) do update set
  farm_id = excluded.farm_id,
  house_id = excluded.house_id,
  name = excluded.name,
  telemetry_topic = excluded.telemetry_topic,
  status_topic = excluded.status_topic,
  command_topic = excluded.command_topic,
  enabled = true;

alter table public.telemetry
  add column if not exists house_id uuid references public.poultry_houses(id) on delete set null,
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists captured_at timestamptz,
  add column if not exists boot_id text,
  add column if not exists schema_version integer,
  add column if not exists firmware_version text,
  add column if not exists replay boolean not null default false,
  add column if not exists buffer_pending integer,
  add column if not exists buffer_dropped bigint,
  add column if not exists identity_mismatch boolean not null default false,
  add column if not exists l0 boolean,
  add column if not exists l1 boolean,
  add column if not exists l2 boolean,
  add column if not exists l3 boolean;

alter table public.telemetry
  drop constraint if exists telemetry_buffer_pending_check,
  drop constraint if exists telemetry_buffer_dropped_check;
alter table public.telemetry
  add constraint telemetry_buffer_pending_check
    check (buffer_pending is null or buffer_pending >= 0),
  add constraint telemetry_buffer_dropped_check
    check (buffer_dropped is null or buffer_dropped >= 0);

drop index if exists public.telemetry_ingest_bucket_unique;
create unique index if not exists telemetry_device_boot_seq_unique
  on public.telemetry (farm_id, device_id, boot_id, seq)
  where boot_id is not null and seq is not null;
create unique index if not exists telemetry_legacy_bucket_unique
  on public.telemetry (farm_id, device_id, ingest_bucket)
  where boot_id is null and ingest_bucket is not null;
create index if not exists telemetry_farm_captured_idx
  on public.telemetry (farm_id, captured_at desc);
create index if not exists telemetry_device_captured_idx
  on public.telemetry (device_id, captured_at desc);
create index if not exists telemetry_house_captured_idx
  on public.telemetry (house_id, captured_at desc);

alter table public.device_latest
  add column if not exists house_id uuid references public.poultry_houses(id) on delete set null,
  add column if not exists captured_at timestamptz,
  add column if not exists boot_id text,
  add column if not exists schema_version integer,
  add column if not exists firmware_version text,
  add column if not exists replay boolean not null default false,
  add column if not exists buffer_pending integer,
  add column if not exists buffer_dropped bigint,
  add column if not exists identity_mismatch boolean not null default false;

create index if not exists device_latest_house_received_idx
  on public.device_latest (house_id, received_at desc);

create table if not exists public.telemetry_five_minute (
  farm_id uuid not null references public.farms(id) on delete cascade,
  house_id uuid references public.poultry_houses(id) on delete set null,
  device_id text not null,
  bucket_start timestamptz not null,
  sample_count integer not null check (sample_count > 0),
  temp_min double precision,
  temp_max double precision,
  temp_avg double precision,
  temp_last double precision,
  volts_last double precision,
  i2_last boolean,
  i3_last boolean,
  i4_last boolean,
  i5_last boolean,
  i6_last boolean,
  i7_last boolean,
  i8_last boolean,
  first_captured_at timestamptz,
  last_captured_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (farm_id, device_id, bucket_start)
);

alter table public.telemetry_five_minute enable row level security;
revoke all on public.telemetry_five_minute from anon, authenticated;
grant select on public.telemetry_five_minute to authenticated;

drop policy if exists telemetry_five_minute_select_member on public.telemetry_five_minute;
create policy telemetry_five_minute_select_member on public.telemetry_five_minute
for select to authenticated
using (private.is_farm_member(farm_id));

create index if not exists telemetry_five_minute_farm_time_idx
  on public.telemetry_five_minute (farm_id, bucket_start desc);
create index if not exists telemetry_five_minute_house_time_idx
  on public.telemetry_five_minute (house_id, bucket_start desc);

create or replace function public.ingest_device_telemetry(
  target_farm uuid,
  target_device text,
  normalized jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_device_id uuid;
  registered_house_id uuid;
  farm_slug text;
  house_slug text;
  received_time timestamptz := coalesce(nullif(normalized->>'received_at', '')::timestamptz, now());
  captured_time timestamptz := nullif(normalized->>'captured_at', '')::timestamptz;
  source_time timestamptz;
  message_boot_id text := nullif(normalized->>'boot_id', '');
  message_seq bigint := nullif(normalized->>'seq', '')::bigint;
  history_inserted boolean := false;
  latest_updated boolean := false;
  identity_differs boolean := false;
begin
  select d.id, d.house_id, f.slug, h.slug
    into registered_device_id, registered_house_id, farm_slug, house_slug
  from public.devices d
  join public.farms f on f.id = d.farm_id
  left join public.poultry_houses h on h.id = d.house_id
  where d.farm_id = target_farm
    and d.mqtt_client_id = target_device
    and d.enabled;

  if not found then
    raise exception 'Unknown or disabled MQTT device' using errcode = '22023';
  end if;

  if message_boot_id is not null and length(message_boot_id) > 96 then
    raise exception 'Invalid boot identifier' using errcode = '22023';
  end if;

  source_time := coalesce(captured_time, received_time);
  identity_differs :=
    (normalized->>'payload_device_id' is not null and normalized->>'payload_device_id' <> target_device)
    or (normalized->>'payload_farm_id' is not null and normalized->>'payload_farm_id' <> farm_slug)
    or (house_slug is not null and normalized->>'payload_house_id' is not null
        and normalized->>'payload_house_id' <> house_slug);

  insert into public.telemetry (
    farm_id, house_id, device_id, recorded_at, received_at, captured_at,
    boot_id, schema_version, firmware_version, replay,
    buffer_pending, buffer_dropped, identity_mismatch,
    seq, up_s, rssi, volts, temp_c, sensor_fault,
    d0, d1, d2, d3, l0, l1, l2, l3,
    i2, i3, i4, i5, i6, i7, i8,
    raw_payload, ingest_bucket
  ) values (
    target_farm, registered_house_id, target_device,
    source_time, received_time, captured_time,
    message_boot_id, nullif(normalized->>'schema_version', '')::integer,
    nullif(normalized->>'firmware_version', ''),
    coalesce((normalized->>'replay')::boolean, false),
    nullif(normalized->>'buffer_pending', '')::integer,
    nullif(normalized->>'buffer_dropped', '')::bigint,
    identity_differs,
    message_seq, nullif(normalized->>'up_s', '')::bigint,
    nullif(normalized->>'rssi', '')::integer,
    nullif(normalized->>'volts', '')::double precision,
    nullif(normalized->>'temp_c', '')::double precision,
    nullif(normalized->>'sensor_fault', '')::boolean,
    nullif(normalized->>'d0', '')::boolean,
    nullif(normalized->>'d1', '')::boolean,
    nullif(normalized->>'d2', '')::boolean,
    nullif(normalized->>'d3', '')::boolean,
    nullif(normalized->>'l0', '')::boolean,
    nullif(normalized->>'l1', '')::boolean,
    nullif(normalized->>'l2', '')::boolean,
    nullif(normalized->>'l3', '')::boolean,
    nullif(normalized->>'i2', '')::boolean,
    nullif(normalized->>'i3', '')::boolean,
    nullif(normalized->>'i4', '')::boolean,
    nullif(normalized->>'i5', '')::boolean,
    nullif(normalized->>'i6', '')::boolean,
    nullif(normalized->>'i7', '')::boolean,
    nullif(normalized->>'i8', '')::boolean,
    coalesce(normalized->'raw_payload', '{}'::jsonb),
    to_timestamp(floor(extract(epoch from source_time) / 300) * 300)
  )
  on conflict do nothing
  returning true into history_inserted;

  insert into public.device_latest (
    farm_id, house_id, device_id, mqtt_status, received_at, captured_at,
    boot_id, schema_version, firmware_version, replay,
    buffer_pending, buffer_dropped, identity_mismatch,
    seq, up_s, rssi, volts, temp_c, sensor_fault,
    d0, d1, d2, d3, l0, l1, l2, l3,
    i2, i3, i4, i5, i6, i7, i8, raw_payload
  ) values (
    target_farm, registered_house_id, target_device, 'online',
    received_time, captured_time, message_boot_id,
    nullif(normalized->>'schema_version', '')::integer,
    nullif(normalized->>'firmware_version', ''),
    coalesce((normalized->>'replay')::boolean, false),
    nullif(normalized->>'buffer_pending', '')::integer,
    nullif(normalized->>'buffer_dropped', '')::bigint,
    identity_differs,
    message_seq, nullif(normalized->>'up_s', '')::bigint,
    nullif(normalized->>'rssi', '')::integer,
    nullif(normalized->>'volts', '')::double precision,
    nullif(normalized->>'temp_c', '')::double precision,
    nullif(normalized->>'sensor_fault', '')::boolean,
    nullif(normalized->>'d0', '')::boolean,
    nullif(normalized->>'d1', '')::boolean,
    nullif(normalized->>'d2', '')::boolean,
    nullif(normalized->>'d3', '')::boolean,
    nullif(normalized->>'l0', '')::boolean,
    nullif(normalized->>'l1', '')::boolean,
    nullif(normalized->>'l2', '')::boolean,
    nullif(normalized->>'l3', '')::boolean,
    nullif(normalized->>'i2', '')::boolean,
    nullif(normalized->>'i3', '')::boolean,
    nullif(normalized->>'i4', '')::boolean,
    nullif(normalized->>'i5', '')::boolean,
    nullif(normalized->>'i6', '')::boolean,
    nullif(normalized->>'i7', '')::boolean,
    nullif(normalized->>'i8', '')::boolean,
    coalesce(normalized->'raw_payload', '{}'::jsonb)
  )
  on conflict (farm_id, device_id) do update set
    house_id = excluded.house_id,
    mqtt_status = 'online',
    received_at = excluded.received_at,
    captured_at = excluded.captured_at,
    boot_id = excluded.boot_id,
    schema_version = excluded.schema_version,
    firmware_version = excluded.firmware_version,
    replay = excluded.replay,
    buffer_pending = excluded.buffer_pending,
    buffer_dropped = excluded.buffer_dropped,
    identity_mismatch = excluded.identity_mismatch,
    seq = excluded.seq,
    up_s = excluded.up_s,
    rssi = excluded.rssi,
    volts = excluded.volts,
    temp_c = excluded.temp_c,
    sensor_fault = excluded.sensor_fault,
    d0 = excluded.d0,
    d1 = excluded.d1,
    d2 = excluded.d2,
    d3 = excluded.d3,
    l0 = excluded.l0,
    l1 = excluded.l1,
    l2 = excluded.l2,
    l3 = excluded.l3,
    i2 = excluded.i2,
    i3 = excluded.i3,
    i4 = excluded.i4,
    i5 = excluded.i5,
    i6 = excluded.i6,
    i7 = excluded.i7,
    i8 = excluded.i8,
    raw_payload = excluded.raw_payload
  where coalesce(excluded.captured_at, excluded.received_at) >
        coalesce(public.device_latest.captured_at, public.device_latest.received_at)
     or (
       coalesce(excluded.captured_at, excluded.received_at) =
       coalesce(public.device_latest.captured_at, public.device_latest.received_at)
       and coalesce(excluded.seq, -1) > coalesce(public.device_latest.seq, -1)
     )
  returning true into latest_updated;

  update public.devices
  set last_seen_at = greatest(coalesce(last_seen_at, received_time), received_time),
      firmware_version = coalesce(nullif(normalized->>'firmware_version', ''), firmware_version)
  where id = registered_device_id;

  return jsonb_build_object(
    'history_inserted', coalesce(history_inserted, false),
    'latest_updated', coalesce(latest_updated, false),
    'identity_mismatch', identity_differs,
    'device_id', target_device,
    'boot_id', message_boot_id,
    'seq', message_seq
  );
end
$$;

create or replace function public.update_device_mqtt_status(
  target_farm uuid,
  target_device text,
  target_status text,
  status_received_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_device public.devices%rowtype;
begin
  if target_status not in ('online', 'offline', 'unknown') then
    raise exception 'Invalid MQTT status' using errcode = '22023';
  end if;

  select * into registered_device
  from public.devices
  where farm_id = target_farm
    and mqtt_client_id = target_device
    and enabled;
  if not found then
    raise exception 'Unknown or disabled MQTT device' using errcode = '22023';
  end if;

  insert into public.device_latest (
    farm_id, house_id, device_id, mqtt_status, received_at
  ) values (
    target_farm, registered_device.house_id, target_device,
    target_status, status_received_at
  )
  on conflict (farm_id, device_id) do update set
    house_id = excluded.house_id,
    mqtt_status = excluded.mqtt_status,
    received_at = greatest(public.device_latest.received_at, excluded.received_at);

  update public.devices
  set last_seen_at = greatest(coalesce(last_seen_at, status_received_at), status_received_at)
  where id = registered_device.id;

  return jsonb_build_object('device_id', target_device, 'mqtt_status', target_status);
end
$$;

revoke all on function public.ingest_device_telemetry(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_device_telemetry(uuid, text, jsonb)
  to service_role;
revoke all on function public.update_device_mqtt_status(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.update_device_mqtt_status(uuid, text, text, timestamptz)
  to service_role;

create or replace function private.refresh_telemetry_five_minute_bucket()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.telemetry_five_minute (
    farm_id, house_id, device_id, bucket_start, sample_count,
    temp_min, temp_max, temp_avg, temp_last, volts_last,
    i2_last, i3_last, i4_last, i5_last, i6_last, i7_last, i8_last,
    first_captured_at, last_captured_at, updated_at
  )
  select
    t.farm_id,
    (array_agg(t.house_id order by t.recorded_at desc))[1],
    t.device_id,
    t.ingest_bucket,
    count(*)::integer,
    min(t.temp_c),
    max(t.temp_c),
    avg(t.temp_c),
    (array_agg(t.temp_c order by t.recorded_at desc)
      filter (where t.temp_c is not null))[1],
    (array_agg(t.volts order by t.recorded_at desc)
      filter (where t.volts is not null))[1],
    (array_agg(t.i2 order by t.recorded_at desc))[1],
    (array_agg(t.i3 order by t.recorded_at desc))[1],
    (array_agg(t.i4 order by t.recorded_at desc))[1],
    (array_agg(t.i5 order by t.recorded_at desc))[1],
    (array_agg(t.i6 order by t.recorded_at desc))[1],
    (array_agg(t.i7 order by t.recorded_at desc))[1],
    (array_agg(t.i8 order by t.recorded_at desc))[1],
    min(t.captured_at),
    max(t.captured_at),
    now()
  from public.telemetry t
  where t.farm_id = new.farm_id
    and t.device_id = new.device_id
    and t.ingest_bucket = new.ingest_bucket
  group by t.farm_id, t.device_id, t.ingest_bucket
  on conflict (farm_id, device_id, bucket_start) do update set
    house_id = excluded.house_id,
    sample_count = excluded.sample_count,
    temp_min = excluded.temp_min,
    temp_max = excluded.temp_max,
    temp_avg = excluded.temp_avg,
    temp_last = excluded.temp_last,
    volts_last = excluded.volts_last,
    i2_last = excluded.i2_last,
    i3_last = excluded.i3_last,
    i4_last = excluded.i4_last,
    i5_last = excluded.i5_last,
    i6_last = excluded.i6_last,
    i7_last = excluded.i7_last,
    i8_last = excluded.i8_last,
    first_captured_at = excluded.first_captured_at,
    last_captured_at = excluded.last_captured_at,
    updated_at = now();
  return new;
end
$$;

drop trigger if exists telemetry_refresh_five_minute on public.telemetry;
create trigger telemetry_refresh_five_minute
after insert on public.telemetry
for each row
when (new.ingest_bucket is not null)
execute function private.refresh_telemetry_five_minute_bucket();
