-- Rolling 30-day OPTA sensor retention. No production or business-table writes.
-- Executed by the postgres-owned cron job; deliberately unavailable to app roles.
create or replace function private.prune_opta_sensor_history()
returns jsonb
language plpgsql
security invoker
set search_path = ''
set timezone = 'UTC'
as $function$
declare
  cutoff_at timestamptz := now() - interval '30 days';
  target_farm record;
  deleted_count bigint;
  raw_deleted bigint := 0;
  buckets_deleted bigint := 0;
  snapshots_deleted bigint := 0;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(7417, 30) then
    return pg_catalog.jsonb_build_object('skipped', true, 'reason', 'cleanup already running');
  end if;

  -- Scope each time-range lookup by farm to use the existing farm/time indexes.
  -- Short, bounded batches avoid a growing full-table scan and long transactions.
  for target_farm in select id from public.farms order by id loop
    with expired as (
      select t.id
      from public.telemetry t
      where t.farm_id = target_farm.id and t.recorded_at < cutoff_at
      order by t.recorded_at
      limit 2000
      for update skip locked
    )
    delete from public.telemetry t using expired e where t.id = e.id;
    get diagnostics deleted_count = row_count;
    raw_deleted := raw_deleted + deleted_count;

    with expired as (
      select b.farm_id, b.device_id, b.bucket_start
      from public.telemetry_five_minute b
      where b.farm_id = target_farm.id
        and b.bucket_start < cutoff_at
        -- Keep a boundary bucket if its retained measurement is still recent.
        and coalesce(b.last_recorded_at, b.bucket_start) < cutoff_at
      order by b.bucket_start
      limit 2000
      for update skip locked
    )
    delete from public.telemetry_five_minute b using expired e
      where b.farm_id=e.farm_id and b.device_id=e.device_id and b.bucket_start=e.bucket_start;
    get diagnostics deleted_count = row_count;
    buckets_deleted := buckets_deleted + deleted_count;

    with expired as (
      select d.farm_id, d.device_id
      from public.device_latest d
      where d.farm_id = target_farm.id
        and coalesce(d.captured_at, d.received_at) < cutoff_at
      limit 2000
      for update skip locked
    )
    delete from public.device_latest d using expired e
      where d.farm_id=e.farm_id and d.device_id=e.device_id;
    get diagnostics deleted_count = row_count;
    snapshots_deleted := snapshots_deleted + deleted_count;
  end loop;

  return pg_catalog.jsonb_build_object(
    'cutoff_at', cutoff_at, 'retention_days', 30, 'batch_limit_per_farm_table', 2000,
    'raw_deleted', raw_deleted, 'five_minute_deleted', buckets_deleted,
    'expired_snapshots_deleted', snapshots_deleted
  );
end
$function$;

revoke all on function private.prune_opta_sensor_history() from public, anon, authenticated;
comment on function private.prune_opta_sensor_history() is
  'Deletes only OPTA sensor data older than 30 days in bounded per-farm batches. Preserves production, flock, inventory, commands and alarm/audit records.';

select cron.schedule(
  'elmajd-sensor-retention-30-days',
  '*/15 * * * *',
  'select private.prune_opta_sensor_history();'
);
