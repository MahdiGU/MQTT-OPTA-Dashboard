-- Live-safe validation: synthetic farm/sensor rows and cleanup are rolled back.
-- No device/network actions; alarms for the synthetic unregistered device are ignored.
begin isolation level repeatable read;
do $test$
declare
  test_farm uuid;
  boundary timestamptz := now() - interval '7 days';
  history_boundary timestamptz := now() - interval '30 days';
  business_before text;
  business_after text;
  outcome jsonb;
begin
  select md5(coalesce(string_agg(to_jsonb(p)::text, E'\n' order by id), ''))
    into business_before from public.daily_production p;

  insert into public.farms(name,slug)
    values ('Retention rollback test', 'retention-test-' || gen_random_uuid()::text)
    returning id into test_farm;

  insert into public.telemetry(farm_id,device_id,recorded_at,received_at,captured_at,ingest_bucket,temp_c,sensor_fault,boot_id,seq)
  select test_farm,'retention-test',stamp,now(),stamp,date_bin(interval '5 minutes',stamp,timestamptz '2000-01-01'),25,false,gen_random_uuid()::text,row_number() over()
  from (values (boundary-interval '1 day'),(boundary-interval '1 second'),(boundary),(boundary+interval '1 second')) timestamps(stamp);

  insert into public.telemetry_five_minute(farm_id,device_id,bucket_start,sample_count,temp_last,last_recorded_at)
    values(test_farm,'legacy-retention-test',date_bin(interval '5 minutes',history_boundary-interval '2 days',timestamptz '2000-01-01'),1,24,null),
      (test_farm,'expired-history-test',date_bin(interval '5 minutes',history_boundary-interval '1 second',timestamptz '2000-01-01'),1,24,history_boundary-interval '1 second'),
      (test_farm,'history-boundary-test',date_bin(interval '5 minutes',history_boundary,timestamptz '2000-01-01'),1,25,history_boundary+interval '1 second');

  insert into public.device_latest(farm_id,device_id,received_at,captured_at,temp_c)
    values(test_farm,'expired-retention-test',now(),boundary-interval '1 day',24),
      (test_farm,'boundary-retention-test',now(),boundary,25);

  outcome := private.prune_opta_sensor_history();
  if outcome ? 'skipped' then raise exception 'Retention test could not obtain maintenance lock'; end if;
  if (select count(*) from public.telemetry where farm_id=test_farm) <> 2 then
    raise exception 'Raw retention must remove old rows and preserve exact-boundary/recent rows';
  end if;
  if exists(select 1 from public.telemetry where farm_id=test_farm and recorded_at<boundary) then
    raise exception 'Expired raw rows remain';
  end if;
  if exists(select 1 from public.telemetry_five_minute where farm_id=test_farm and coalesce(last_recorded_at,bucket_start)<history_boundary) then
    raise exception 'Expired five-minute or legacy samples remain';
  end if;
  if not exists(select 1 from public.telemetry_five_minute where farm_id=test_farm and device_id='history-boundary-test') then
    raise exception 'A retained measurement in a boundary bucket was incorrectly deleted';
  end if;
  if not exists(select 1 from public.telemetry_five_minute where farm_id=test_farm and last_recorded_at<boundary and last_recorded_at>=history_boundary) then
    raise exception 'Five-minute history aged 7-30 days must remain after raw readings expire';
  end if;
  if (select count(*) from public.device_latest where farm_id=test_farm) <> 1 then
    raise exception 'Snapshot retention did not preserve only the boundary snapshot';
  end if;

  select md5(coalesce(string_agg(to_jsonb(p)::text, E'\n' order by id), ''))
    into business_after from public.daily_production p;
  if business_before is distinct from business_after then raise exception 'Production data changed'; end if;
  if has_function_privilege('anon','private.prune_opta_sensor_history()','execute')
    or has_function_privilege('authenticated','private.prune_opta_sensor_history()','execute') then
    raise exception 'Application roles must not execute sensor cleanup';
  end if;
end
$test$;
rollback;
select 'PASS: raw readings/snapshots expire at 7 days; five-minute history at 30 days; boundary/recent readings, production and app-role restrictions preserved; fixtures rolled back' as retention_test;
