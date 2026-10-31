begin;
do $$
declare f uuid; h uuid; owner_id uuid; manager_id uuid; new_event uuid; delivery_id uuid;
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); result jsonb; job jsonb;
begin
  select farm_id,user_id into f,owner_id from public.farm_members where role='owner' limit 1;
  select user_id into manager_id from public.farm_members where farm_id=f and role='manager' limit 1;
  select id into h from public.poultry_houses where farm_id=f limit 1;
  update public.alarm_events set acknowledged_at=now() where farm_id=f;
  delete from public.alarm_deliveries where farm_id=f;
  delete from public.push_devices where farm_id=f;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.register_push_device(f,a,repeat('a',100),true);
  perform public.register_push_device(f,b,repeat('b',100),true);
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  begin
    perform public.register_push_device(f,a,repeat('c',100),true);raise exception 'Phone takeover accepted';
  exception when insufficient_privilege then null;end;
  insert into public.alarm_events(farm_id,house_id,device_id,code,severity,detected_at,activated_at,repeat_seconds)
    values(f,h,'push-test-device','push_test','critical',now(),now(),600) returning id into new_event;
  select id into delivery_id from public.alarm_deliveries where event_id=new_event and user_id=owner_id;
  result:=public.claim_push_deliveries();
  select value into job from jsonb_array_elements(result) where value->>'id'=delivery_id::text;
  if job is null or jsonb_array_length(job->'devices')<>2 then raise exception 'Two-phone claim failed'; end if;
  if jsonb_array_length(public.claim_push_deliveries())<>0 then raise exception 'Lease permitted duplicate dispatch'; end if;
  perform public.finish_push_delivery(delivery_id,(job->>'lease_id')::uuid,jsonb_build_array(
    jsonb_build_object('installation_id',a,'token',repeat('a',100),'status','sent','provider_message_id','mock:1'),
    jsonb_build_object('installation_id',b,'token',repeat('b',100),'status','retry','error_code','UNAVAILABLE')));
  update public.alarm_deliveries set next_attempt_at=now()-interval '1 second' where id=delivery_id;
  result:=public.claim_push_deliveries();select value into job from jsonb_array_elements(result) where value->>'id'=delivery_id::text;
  if jsonb_array_length(job->'devices')<>1 or job->'devices'->0->>'installation_id'<>b::text then raise exception 'Already-sent phone was repeated'; end if;
  perform public.finish_push_delivery(delivery_id,(job->>'lease_id')::uuid,jsonb_build_array(jsonb_build_object('installation_id',b,'token',repeat('b',100),'status','invalid','error_code','UNREGISTERED')));
  if (select enabled from public.push_devices where installation_id=b) then raise exception 'Invalid token still enabled'; end if;
  if (select status from public.alarm_deliveries where id=delivery_id)<>'sent' then raise exception 'Successful delivery not finalized'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);perform public.unregister_push_device(a);
  if exists(select 1 from public.push_devices where installation_id=a) then raise exception 'Sign-out did not unregister'; end if;
  if has_function_privilege('authenticated','public.push_worker_config()','execute') or has_function_privilege('anon','public.claim_push_deliveries()','execute') then raise exception 'Worker or secret access exposed'; end if;
end $$;
select 'PASS: registration, takeover denied, lease exclusivity, per-phone retry, invalid token disable, unregister, service-only secrets' as result;
rollback;
