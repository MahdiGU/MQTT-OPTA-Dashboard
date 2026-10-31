-- Self-contained transaction: all simulated rows and changes are rolled back.
-- Run after the Phase 3 migrations. No provider sends occur.
begin;
do $$
declare f uuid; h uuid; at_time timestamptz:=date_trunc('second',now())+interval '1 day';
  j integer; result jsonb; owner_id uuid; event_to_ack uuid; total integer;
begin
  select farm_id,house_id into f,h from public.devices where mqtt_client_id='opta-control-01';
  if f is null then raise exception 'Pilot device required'; end if;
  delete from private.alarm_condition_state where farm_id=f;
  delete from public.alarm_events where farm_id=f;
  update private.alarm_device_clock set last_source_at=null where farm_id=f;
  for j in 0..60 loop
    result:=public.ingest_device_telemetry(f,'opta-control-01',jsonb_build_object(
      'received_at',at_time+make_interval(secs=>j*5),'captured_at',at_time+make_interval(secs=>j*5),
      'boot_id','phase3-transaction-test','seq',j,'temp_c',34,'sensor_fault',false,
      'i2',false,'i3',false,'i4',false,'i5',false,'i6',false,'i7',false,'replay',false));
    if j=23 and exists(select 1 from public.alarm_events where farm_id=f) then raise exception 'Alarm before activation delay'; end if;
    if j=24 and (select count(*) from public.alarm_events where farm_id=f and resolved_at is null)<>2 then raise exception 'Critical/cooling activation failed'; end if;
  end loop;
  select count(*) into total from public.alarm_events where farm_id=f and resolved_at is null;
  if total<>8 then raise exception 'Expected 8 active alarms, found %',total; end if;
  perform private.alarm_maintenance(at_time+interval '5 minutes');
  if not exists(select 1 from public.alarm_deliveries where farm_id=f and channel='push') then raise exception 'Push queue empty'; end if;
  select user_id into owner_id from public.farm_members where farm_id=f and role='owner' limit 1;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select id into event_to_ack from public.alarm_events where farm_id=f and code='temperature_critical';
  perform public.acknowledge_alarm(event_to_ack);
  perform public.acknowledge_alarm(event_to_ack);
  if (select count(*) from public.alarm_audit where event_id=event_to_ack and action='acknowledged')<>1 then raise exception 'Acknowledgement not idempotent'; end if;
  if exists(select 1 from public.alarm_deliveries where event_id=event_to_ack and status='pending') then raise exception 'Ack did not cancel pending delivery'; end if;
  -- Older replay must not change alarm state or reset freshness.
  result:=public.ingest_device_telemetry(f,'opta-control-01',jsonb_build_object(
    'received_at',at_time+interval '6 minutes','captured_at',at_time-interval '1 hour',
    'boot_id','phase3-transaction-test','seq',1000,'temp_c',0,'sensor_fault',false,'replay',true));
  if (select last_live_at from private.alarm_device_clock where farm_id=f and device_id='opta-control-01')<>at_time+interval '5 minutes' then raise exception 'Replay reset freshness'; end if;
  perform private.alarm_maintenance(at_time+interval '10 minutes');
  if not exists(select 1 from public.alarm_events where farm_id=f and code='controller_offline' and resolved_at is null) then raise exception 'Offline alarm missing'; end if;
  perform private.alarm_maintenance(at_time+interval '16 minutes');
  if not exists(select 1 from public.alarm_deliveries where farm_id=f and channel='email' and event_id<>event_to_ack) then raise exception 'Email fallback missing'; end if;
  if exists(select 1 from public.alarm_deliveries where event_id=event_to_ack and channel='email') then raise exception 'Email sent after ack'; end if;
  for j in 0..60 loop
    result:=public.ingest_device_telemetry(f,'opta-control-01',jsonb_build_object(
      'received_at',at_time+interval '17 minutes'+make_interval(secs=>j*5),
      'captured_at',at_time+interval '17 minutes'+make_interval(secs=>j*5),
      'boot_id','phase3-transaction-test','seq',2000+j,'temp_c',28,'sensor_fault',false,
      'i2',true,'i3',true,'i4',true,'i5',true,'i6',true,'i7',true,'replay',false));
  end loop;
  if exists(select 1 from public.alarm_events where farm_id=f and resolved_at is null) then raise exception 'Recovery failed'; end if;
  for j in 1..2 loop
    result:=public.ingest_device_telemetry(f,'opta-control-01',jsonb_build_object(
      'received_at',at_time+interval '22 minutes'+make_interval(secs=>j*5),
      'captured_at',at_time+interval '22 minutes'+make_interval(secs=>j*5),
      'boot_id','phase3-transaction-test','seq',3000+j,'temp_c',null,'sensor_fault',true,'replay',false));
  end loop;
  if not exists(select 1 from public.alarm_events where farm_id=f and code='sensor_fault' and resolved_at is null) then raise exception 'Two-sample fault missing'; end if;
  for j in 3..4 loop
    result:=public.ingest_device_telemetry(f,'opta-control-01',jsonb_build_object(
      'received_at',at_time+interval '22 minutes'+make_interval(secs=>j*5),
      'captured_at',at_time+interval '22 minutes'+make_interval(secs=>j*5),
      'boot_id','phase3-transaction-test','seq',3000+j,'temp_c',28,'sensor_fault',false,'replay',false));
    if j=3 and not exists(select 1 from public.alarm_events where farm_id=f and code='sensor_fault' and resolved_at is null) then raise exception 'Sensor recovered after only one sample'; end if;
  end loop;
  if exists(select 1 from public.alarm_events where farm_id=f and code='sensor_fault' and resolved_at is null) then raise exception 'Two-sample sensor recovery failed'; end if;
  perform public.configure_alarm_temperature(h,31,34);
  if not exists(select 1 from public.alarm_configuration_audit where house_id=h and actor_id=owner_id) then raise exception 'Configuration audit missing'; end if;
  -- An authenticated user outside the farm cannot acknowledge/configure it.
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.acknowledge_alarm(event_to_ack);
    raise exception 'Cross-farm acknowledgement permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.configure_alarm_temperature(h,32,35);
    raise exception 'Cross-farm configuration permitted';
  exception when insufficient_privilege then null;
  end;
  -- Service-only internals cannot be invoked by clients.
  if has_function_privilege('authenticated','private.alarm_maintenance(timestamptz)','execute') then raise exception 'Maintenance publicly executable'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.acknowledge_alarm(event_to_ack);
    raise exception 'Anonymous acknowledgement permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'PASS: delays, recovery, duplicate ack, replay exclusion, offline, queue, email escalation, sensor fault, permissions' as phase3_test_result;
rollback;
