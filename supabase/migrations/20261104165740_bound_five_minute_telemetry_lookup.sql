-- Bound the per-frame aggregate to its source-time window.
-- Both schema-2 ingestion and verified legacy rows put recorded_at in ingest_bucket.
-- This uses the existing telemetry_device_time_idx; no history/index rebuild needed.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

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
    -- Ingestion derives both fields from the same source_time; legacy checked.
    -- These bounds expose the existing (device_id, recorded_at) index.
    and t.recorded_at >= new.ingest_bucket
    and t.recorded_at < new.ingest_bucket + interval '5 minutes'
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
