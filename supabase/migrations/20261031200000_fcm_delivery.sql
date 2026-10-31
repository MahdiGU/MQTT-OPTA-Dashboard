create table public.push_devices (
  installation_id uuid primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fcm_token text not null unique check(length(fcm_token) between 40 and 4096),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now()
);
create index push_devices_user_idx on public.push_devices(user_id);
create index push_devices_farm_idx on public.push_devices(farm_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon,authenticated;
grant select on public.push_devices to authenticated;
create policy push_devices_own on public.push_devices for select to authenticated using(user_id=(select auth.uid()) and private.is_farm_member(farm_id));

create function public.register_push_device(target_farm uuid,installation uuid,device_token text,notifications_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Push registration access denied' using errcode='42501'; end if;
  if installation is null or device_token is null or length(device_token) not between 40 and 4096 or notifications_enabled is null then raise exception 'Invalid device registration'; end if;
  -- Transfer a phone only when it presents the same secret Firebase token.
  if exists(select 1 from public.push_devices where installation_id=installation and user_id<>auth.uid() and fcm_token<>device_token) then raise exception 'Installation belongs to another user' using errcode='42501'; end if;
  delete from public.push_devices where user_id=auth.uid() and fcm_token=device_token and installation_id<>installation;
  insert into public.push_devices(installation_id,farm_id,user_id,fcm_token,enabled)
  values(installation,target_farm,auth.uid(),device_token,notifications_enabled)
  on conflict(installation_id) do update set farm_id=excluded.farm_id,user_id=excluded.user_id,fcm_token=excluded.fcm_token,enabled=excluded.enabled,last_seen_at=now();
end $$;
create function public.unregister_push_device(installation uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  delete from public.push_devices where installation_id=installation and user_id=auth.uid();
end $$;
revoke all on function public.register_push_device(uuid,uuid,text,boolean),public.unregister_push_device(uuid) from public,anon;
grant execute on function public.register_push_device(uuid,uuid,text,boolean),public.unregister_push_device(uuid) to authenticated;

alter table public.alarm_deliveries add column lease_id uuid,add column lease_until timestamptz,add column next_attempt_at timestamptz not null default now();
create table public.push_delivery_attempts (
  delivery_id uuid not null references public.alarm_deliveries(id) on delete cascade,
  installation_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('sent','retry','invalid')),
  attempts integer not null default 1,
  provider_message_id text,
  error_code text,
  updated_at timestamptz not null default now(),
  primary key(delivery_id,installation_id)
);
create index push_delivery_attempts_farm_idx on public.push_delivery_attempts(farm_id);
create index push_delivery_attempts_user_idx on public.push_delivery_attempts(user_id);
alter table public.push_delivery_attempts enable row level security;
revoke all on public.push_delivery_attempts from anon,authenticated;
grant select on public.push_delivery_attempts to authenticated;
create policy push_attempts_own on public.push_delivery_attempts for select to authenticated using(user_id=(select auth.uid()) and private.is_farm_member(farm_id));

create function public.push_worker_config() returns jsonb
language sql security definer set search_path='' as $$
select jsonb_build_object('service_account',(select decrypted_secret::jsonb from vault.decrypted_secrets where name='elmajd_fcm_service_account'),
  'worker_secret',(select decrypted_secret from vault.decrypted_secrets where name='elmajd_push_worker_secret'))
$$;
revoke all on function public.push_worker_config() from public,anon,authenticated;
grant execute on function public.push_worker_config() to service_role;

create function public.claim_push_deliveries() returns jsonb language plpgsql security definer set search_path='' as $$
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
    select jsonb_agg(jsonb_build_object('installation_id',p.installation_id,'token',p.fcm_token)) into devices
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
create function public.finish_push_delivery(delivery uuid,lease uuid,results jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare d public.alarm_deliveries%rowtype; entry jsonb; has_retry boolean:=false; has_sent boolean:=false;
begin
  select * into d from public.alarm_deliveries where id=delivery and lease_id=lease and status='pending' for update;
  if not found then return; end if;
  for entry in select value from jsonb_array_elements(results) loop
    if entry->>'status' not in ('sent','retry','invalid') then raise exception 'Invalid delivery outcome'; end if;
    insert into public.push_delivery_attempts(delivery_id,installation_id,farm_id,user_id,status,provider_message_id,error_code)
    values(d.id,(entry->>'installation_id')::uuid,d.farm_id,d.user_id,entry->>'status',entry->>'provider_message_id',entry->>'error_code')
    on conflict(delivery_id,installation_id) do update set status=excluded.status,attempts=public.push_delivery_attempts.attempts+1,
      provider_message_id=excluded.provider_message_id,error_code=excluded.error_code,updated_at=now();
    if entry->>'status'='invalid' then update public.push_devices set enabled=false
      where installation_id=(entry->>'installation_id')::uuid and fcm_token=entry->>'token' and user_id=d.user_id; end if;
    has_retry:=has_retry or entry->>'status'='retry';
  end loop;
  select exists(select 1 from public.push_delivery_attempts where delivery_id=d.id and status='sent') into has_sent;
  update public.alarm_deliveries set lease_id=null,lease_until=null,
    status=case when has_retry then case when d.attempts<6 then 'pending' else 'failed' end when has_sent then 'sent' else 'failed' end,
    sent_at=case when has_sent then now() else null end,
    last_error=case when has_retry then 'Some phone deliveries need retry' when not has_sent then 'No valid phone accepted the message' else null end,
    next_attempt_at=now()+make_interval(secs=>least(1800,30*power(2,least(d.attempts,6))::integer))
    where id=d.id;
end $$;
revoke all on function public.claim_push_deliveries(),public.finish_push_delivery(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(),public.finish_push_delivery(uuid,uuid,jsonb) to service_role;

create function public.push_target_authorized(delivery uuid,lease uuid,installation uuid,device_token text) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from public.alarm_deliveries d join public.alarm_events e on e.id=d.event_id
  join public.farm_members m on m.farm_id=d.farm_id and m.user_id=d.user_id and m.role in ('owner','manager')
  join public.push_devices p on p.farm_id=d.farm_id and p.user_id=d.user_id
  where d.id=delivery and d.lease_id=lease and d.status='pending' and d.lease_until>now()
    and e.acknowledged_at is null and e.resolved_at is null
    and p.installation_id=installation and p.fcm_token=device_token and p.enabled)
$$;
revoke all on function public.push_target_authorized(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.push_target_authorized(uuid,uuid,uuid,text) to service_role;

create extension if not exists pg_net with schema extensions;
-- Vault supplies the scheduler secret at runtime; no credential is committed.
select cron.schedule('elmajd-push-dispatch','* * * * *', $cron$
select net.http_post(
  url:='https://zlmaombpfdznambrgqiv.supabase.co/functions/v1/dispatch-alarms',
  headers:=jsonb_build_object('content-type','application/json','x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='elmajd_push_worker_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=55000);
$cron$);
