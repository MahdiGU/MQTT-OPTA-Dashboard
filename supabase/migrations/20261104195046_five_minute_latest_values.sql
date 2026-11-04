-- Latest source-time sample per five-minute interval. Raw storage and alarms stay intact.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.telemetry_five_minute
  add column if not exists last_recorded_at timestamptz,
  add column if not exists last_received_at timestamptz;

-- One-time indexed seed for existing intervals, including receipt-time fallback.
-- No table-wide raw-history scan is performed by the per-message trigger below.
with seeds as (
  select b.farm_id,b.device_id,b.bucket_start,t.house_id,t.temp_c,t.volts,t.i2,t.i3,t.i4,t.i5,t.i6,t.i7,t.i8,t.recorded_at,t.received_at
  from public.telemetry_five_minute b
  cross join lateral (
    select house_id,temp_c,volts,i2,i3,i4,i5,i6,i7,i8,recorded_at,received_at from public.telemetry t
    where t.farm_id=b.farm_id and t.device_id=b.device_id
      and t.recorded_at>=b.bucket_start
      and t.recorded_at<b.bucket_start+interval '5 minutes'
    order by t.recorded_at desc,t.received_at desc
    limit 1
  ) t
  where b.last_recorded_at is null
)
update public.telemetry_five_minute b set
  house_id=s.house_id,
  temp_last=s.temp_c,
  volts_last=s.volts,
  i2_last=s.i2,
  i3_last=s.i3,
  i4_last=s.i4,
  i5_last=s.i5,
  i6_last=s.i6,
  i7_last=s.i7,
  i8_last=s.i8,
  last_recorded_at=s.recorded_at,
  last_received_at=s.received_at,
  temp_min=null,temp_max=null,temp_avg=null
from seeds s
where b.farm_id=s.farm_id and b.device_id=s.device_id and b.bucket_start=s.bucket_start;

create or replace function private.refresh_telemetry_five_minute_bucket()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  insert into public.telemetry_five_minute as saved (
    farm_id,house_id,device_id,bucket_start,sample_count,
    temp_last,volts_last,i2_last,i3_last,i4_last,i5_last,i6_last,i7_last,i8_last,
    first_captured_at,last_captured_at,last_recorded_at,last_received_at,updated_at
  ) values (
    new.farm_id,new.house_id,new.device_id,new.ingest_bucket,1,
    new.temp_c,new.volts,new.i2,new.i3,new.i4,new.i5,new.i6,new.i7,new.i8,
    new.captured_at,new.captured_at,new.recorded_at,new.received_at,now()
  )
  on conflict (farm_id,device_id,bucket_start) do update set
    sample_count=saved.sample_count+1,
    temp_min=null,temp_max=null,temp_avg=null,
    house_id=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.house_id else saved.house_id end,
    temp_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.temp_last else saved.temp_last end,
    volts_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.volts_last else saved.volts_last end,
    i2_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i2_last else saved.i2_last end,
    i3_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i3_last else saved.i3_last end,
    i4_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i4_last else saved.i4_last end,
    i5_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i5_last else saved.i5_last end,
    i6_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i6_last else saved.i6_last end,
    i7_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i7_last else saved.i7_last end,
    i8_last=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.i8_last else saved.i8_last end,
    last_recorded_at=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.last_recorded_at else saved.last_recorded_at end,
    last_received_at=case when (excluded.last_recorded_at, excluded.last_received_at) > (coalesce(saved.last_recorded_at, saved.bucket_start), coalesce(saved.last_received_at, '-infinity'::timestamptz)) then excluded.last_received_at else saved.last_received_at end,
    first_captured_at=least(saved.first_captured_at,excluded.first_captured_at),
    last_captured_at=greatest(saved.last_captured_at,excluded.last_captured_at),
    updated_at=now();
  return new;
end $$;

comment on table public.telemetry_five_minute is
  'Latest measurement per five-minute interval; sample_count is a lightweight count of distinct raw inserts. No per-interval averages are calculated.';
comment on column public.telemetry_five_minute.temp_avg is 'Deprecated; null for latest-value history.';
comment on column public.telemetry_five_minute.temp_min is 'Deprecated; null for latest-value history.';
comment on column public.telemetry_five_minute.temp_max is 'Deprecated; null for latest-value history.';
comment on column public.telemetry_five_minute.last_recorded_at is 'Source timestamp of the retained sample; captured_at when available, otherwise received_at.';
comment on column public.telemetry_five_minute.last_received_at is 'Receipt timestamp of the retained sample; breaks equal source-time ties.';
