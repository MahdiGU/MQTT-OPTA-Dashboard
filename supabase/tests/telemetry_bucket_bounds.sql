-- Isolated fixture, including every aggregate-changing edge case. No providers
-- or equipment are invoked, and every simulated row is rolled back.
begin;
set local statement_timeout = '120s';
do $$
declare
  f uuid; h uuid; d text := 'bucket-bounds-' || gen_random_uuid()::text;
  base timestamptz := date_trunc('hour', now() - interval '1 day');
  r jsonb; a public.telemetry_five_minute%rowtype;
begin
  insert into public.farms(slug,name) values(d,'Rolled-back bucket lookup test') returning id into f;
  insert into public.poultry_houses(farm_id,slug,name) values(f,'house-01','Test house') returning id into h;
  insert into public.devices(farm_id,house_id,mqtt_client_id,name) values(f,h,d,'Test controller');

  -- Legacy rows share the same valid bucket/time invariant.
  insert into public.telemetry(farm_id,house_id,device_id,recorded_at,received_at,ingest_bucket,temp_c,i2)
    values(f,h,d,base,base,base,5,false);
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',1,
    'captured_at',base+interval '1 second','received_at',base+interval '1 second',
    'replay',true,'temp_c',10,'volts',1,'i2',false));
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',2,
    'captured_at',base+interval '299 seconds','received_at',base+interval '299 seconds',
    'replay',true,'temp_c',30,'volts',3,'i2',true));
  -- Out-of-order insertion must not replace the latest value in its bucket.
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',3,
    'captured_at',base+interval '120 seconds','received_at',base+interval '120 seconds',
    'replay',true,'temp_c',20,'volts',2,'i2',false));
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',4,
    'captured_at',base+interval '180 seconds','received_at',base+interval '180 seconds',
    'replay',true,'temp_c',null,'sensor_fault',true,'i2',false));
  -- The exact upper boundary belongs to the next bucket.
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',5,
    'captured_at',base+interval '300 seconds','received_at',base+interval '300 seconds',
    'replay',true,'temp_c',40,'volts',4,'i2',false));
  -- A device without NTP still buckets by its receipt-based recorded_at.
  perform public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',6,
    'received_at',base+interval '200 seconds','replay',true,'temp_c',25,'volts',2.5,'i2',false));
  r := public.ingest_device_telemetry(f,d,jsonb_build_object('boot_id','bounds-test','seq',2,
    'captured_at',base+interval '299 seconds','received_at',base+interval '299 seconds',
    'replay',true,'temp_c',99,'volts',9,'i2',false));
  if (r->>'history_inserted')::boolean then raise exception 'Duplicate frame inserted'; end if;

  select * into a from public.telemetry_five_minute where farm_id=f and device_id=d and bucket_start=base;
  if a.sample_count is distinct from 6 or a.temp_min is distinct from 5::float8
      or a.temp_max is distinct from 30::float8 or abs(a.temp_avg-18)>0.000001
      or a.temp_last is distinct from 30::float8 or a.volts_last is distinct from 3::float8
      or a.i2_last is distinct from true then raise exception 'Bucket values incorrect: %',row_to_json(a); end if;
  if a.first_captured_at is distinct from base+interval '1 second'
      or a.last_captured_at is distinct from base+interval '299 seconds' then raise exception 'Capture bounds incorrect'; end if;
  if not exists(select 1 from public.telemetry_five_minute where farm_id=f and device_id=d
      and bucket_start=base+interval '5 minutes' and sample_count=1 and temp_last=40) then
    raise exception 'Upper-boundary sample assigned to wrong bucket'; end if;
  if (select count(*) from public.telemetry where farm_id=f)<>7 then raise exception 'Raw sample count incorrect'; end if;
  if not exists(select 1 from public.device_latest where farm_id=f and seq=5 and temp_c=40) then
    raise exception 'Out-of-order replay replaced latest state'; end if;
end $$;
rollback;
select 'PASS: bucket edges, replay ordering, null temperature, receipt-time fallback, legacy, deduplication' as result;
