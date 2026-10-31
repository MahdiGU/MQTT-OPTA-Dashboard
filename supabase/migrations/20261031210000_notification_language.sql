alter table public.push_devices add column language_code text not null default 'en' check(language_code in ('fr','en'));
create function public.register_push_device(target_farm uuid,installation uuid,device_token text,notifications_enabled boolean,preferred_language text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if preferred_language is null or preferred_language not in ('fr','en') then raise exception 'Invalid language';end if;
  perform public.register_push_device(target_farm,installation,device_token,notifications_enabled);
  update public.push_devices set language_code=preferred_language where installation_id=installation and user_id=auth.uid();
end $$;
revoke all on function public.register_push_device(uuid,uuid,text,boolean,text) from public,anon;
grant execute on function public.register_push_device(uuid,uuid,text,boolean,text) to authenticated;
create or replace function public.claim_push_deliveries() returns jsonb language plpgsql security definer set search_path='' as $$
declare item record; devices jsonb; jobs jsonb:='[]'; lease uuid;
begin
  perform private.alarm_maintenance();
  for item in select d.id,d.farm_id,d.user_id,d.event_id,d.attempts,e.code,e.severity,e.activated_at,e.repeat_seconds,e.resolved_at,e.acknowledged_at
    from public.alarm_deliveries d join public.alarm_events e on e.id=d.event_id
    where d.channel='push' and d.status='pending' and d.next_attempt_at<=now() and (d.lease_until is null or d.lease_until<now())
    order by d.created_at limit 10 for update of d skip locked
  loop
    if item.resolved_at is not null or item.acknowledged_at is not null or not exists(select 1 from public.farm_members where farm_id=item.farm_id and user_id=item.user_id and role in ('owner','manager')) then
      update public.alarm_deliveries set status='cancelled',lease_id=null,lease_until=null where id=item.id;continue;
    end if;
    select jsonb_agg(jsonb_build_object('installation_id',p.installation_id,'token',p.fcm_token,'language',p.language_code)) into devices
    from public.push_devices p where p.farm_id=item.farm_id and p.user_id=item.user_id and p.enabled and p.last_seen_at>now()-interval '30 days'
      and not exists(select 1 from public.push_delivery_attempts a where a.delivery_id=item.id and a.installation_id=p.installation_id and a.status='sent');
    if devices is null then
      if exists(select 1 from public.push_delivery_attempts where delivery_id=item.id and status='sent') then
        update public.alarm_deliveries set status='sent',sent_at=now(),lease_id=null,lease_until=null where id=item.id;
      else update public.alarm_deliveries set next_attempt_at=now()+interval '1 minute' where id=item.id;
      end if;continue;
    end if;
    lease:=gen_random_uuid();
    update public.alarm_deliveries set lease_id=lease,lease_until=now()+interval '3 minutes',attempts=attempts+1 where id=item.id;
    jobs:=jobs||jsonb_build_array(jsonb_build_object('id',item.id,'lease_id',lease,'event_id',item.event_id,'recipient_id',item.user_id,'code',item.code,'severity',item.severity,'devices',devices));
  end loop;
  return jobs;
end $$;
