-- Phase 3: server-side alarm lifecycle and durable delivery intentions.
create table public.alarm_settings (
  house_id uuid primary key references public.poultry_houses(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  warning_c double precision not null default 30 check (warning_c between -49 and 98),
  critical_c double precision not null default 33 check (critical_c between -48 and 100),
  updated_at timestamptz not null default now(),
  check (critical_c >= warning_c + 1)
);
insert into public.alarm_settings(house_id,farm_id) select id,farm_id from public.poultry_houses;
create index alarm_settings_farm_idx on public.alarm_settings(farm_id);

create table public.alarm_configuration_audit (
  id bigint generated always as identity primary key,
  house_id uuid not null references public.poultry_houses(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default now(),
  old_values jsonb not null,
  new_values jsonb not null
);
create index alarm_configuration_audit_house_idx on public.alarm_configuration_audit(house_id);
create index alarm_configuration_audit_farm_idx on public.alarm_configuration_audit(farm_id);
create index alarm_configuration_audit_actor_idx on public.alarm_configuration_audit(actor_id);
alter table public.alarm_configuration_audit enable row level security;
revoke all on public.alarm_configuration_audit from anon,authenticated;
grant select on public.alarm_configuration_audit to authenticated;
create policy alarm_config_audit_read on public.alarm_configuration_audit for select to authenticated using(private.is_farm_member(farm_id));

create table public.alarm_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  house_id uuid references public.poultry_houses(id) on delete set null,
  device_id text not null,
  code text not null,
  severity text not null check (severity in ('warning','critical')),
  detected_at timestamptz not null,
  activated_at timestamptz not null,
  resolved_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  evidence jsonb not null default '{}',
  repeat_seconds integer not null check (repeat_seconds > 0),
  email_fallback boolean not null default false
);
create unique index alarm_one_open_condition on public.alarm_events(farm_id,device_id,code) where resolved_at is null;
create index alarm_events_farm_time_idx on public.alarm_events(farm_id,activated_at desc);
create index alarm_events_house_idx on public.alarm_events(house_id);
create index alarm_events_ack_user_idx on public.alarm_events(acknowledged_by);

create table public.alarm_audit (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.alarm_events(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  action text not null check(action in ('activated','acknowledged','resolved')),
  occurred_at timestamptz not null,
  actor_id uuid references auth.users(id),
  detail jsonb not null default '{}'
);
create index alarm_audit_event_idx on public.alarm_audit(event_id);
create index alarm_audit_farm_idx on public.alarm_audit(farm_id);
create index alarm_audit_actor_idx on public.alarm_audit(actor_id);

create table public.alarm_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.alarm_events(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('push','email')),
  repeat_slot integer not null,
  status text not null default 'pending' check(status in ('pending','sent','failed','cancelled')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique(event_id,user_id,channel,repeat_slot)
);
create index alarm_deliveries_farm_idx on public.alarm_deliveries(farm_id);
create index alarm_deliveries_user_idx on public.alarm_deliveries(user_id);
create index alarm_deliveries_pending_idx on public.alarm_deliveries(created_at) where status='pending';

create table private.alarm_condition_state (
  farm_id uuid not null,
  device_id text not null,
  code text not null,
  breach_since timestamptz,
  recovery_since timestamptz,
  breach_samples integer not null default 0,
  recovery_samples integer not null default 0,
  last_at timestamptz,
  event_id uuid references public.alarm_events(id),
  primary key(farm_id,device_id,code)
);
create table private.alarm_device_clock (
  farm_id uuid not null,
  device_id text not null,
  last_live_at timestamptz not null,
  last_source_at timestamptz,
  primary key(farm_id,device_id)
);
insert into private.alarm_device_clock(farm_id,device_id,last_live_at)
select farm_id,mqtt_client_id,now() from public.devices where enabled;

alter table public.alarm_settings enable row level security;
alter table public.alarm_events enable row level security;
alter table public.alarm_audit enable row level security;
alter table public.alarm_deliveries enable row level security;
alter table private.alarm_condition_state enable row level security;
alter table private.alarm_device_clock enable row level security;
revoke all on public.alarm_settings,public.alarm_events,public.alarm_audit,public.alarm_deliveries from anon,authenticated;
grant select on public.alarm_settings,public.alarm_events,public.alarm_audit,public.alarm_deliveries to authenticated;
create policy alarm_settings_read on public.alarm_settings for select to authenticated using(private.is_farm_member(farm_id));
create policy alarm_events_read on public.alarm_events for select to authenticated using(private.is_farm_member(farm_id));
create policy alarm_audit_read on public.alarm_audit for select to authenticated using(private.is_farm_member(farm_id));
create policy alarm_deliveries_read on public.alarm_deliveries for select to authenticated using(user_id=(select auth.uid()) and private.is_farm_member(farm_id));

create function private.advance_alarm(
  f uuid,h uuid,d text,c text,sev text,at_time timestamptz,
  breach boolean,recovery boolean,activate_seconds integer,recover_seconds integer,
  required_samples integer,repeat_sec integer,email_enabled boolean,details jsonb
) returns void language plpgsql security invoker set search_path='' as $$
declare s private.alarm_condition_state%rowtype; e uuid;
begin
  insert into private.alarm_condition_state(farm_id,device_id,code) values(f,d,c) on conflict do nothing;
  select * into s from private.alarm_condition_state where farm_id=f and device_id=d and code=c for update;
  if s.last_at is not null and at_time <= s.last_at then return; end if;
  -- Missing samples break continuous-duration and consecutive-sample evidence.
  if s.last_at is not null and at_time-s.last_at > interval '30 seconds' and c <> 'controller_offline' then
    s.breach_since:=null; s.recovery_since:=null; s.breach_samples:=0; s.recovery_samples:=0;
  end if;
  if s.event_id is null then
    if breach is true then
      s.breach_since:=coalesce(s.breach_since,at_time); s.breach_samples:=s.breach_samples+1;
      if at_time-s.breach_since >= make_interval(secs=>activate_seconds) and s.breach_samples>=required_samples then
        insert into public.alarm_events(farm_id,house_id,device_id,code,severity,detected_at,activated_at,repeat_seconds,email_fallback,evidence)
        values(f,h,d,c,sev,s.breach_since,at_time,repeat_sec,email_enabled,details) returning id into e;
        s.event_id:=e;
        insert into public.alarm_audit(event_id,farm_id,action,occurred_at,detail) values(e,f,'activated',at_time,details);
      end if;
    else s.breach_since:=null; s.breach_samples:=0;
    end if;
  else
    if recovery is true then
      s.recovery_since:=coalesce(s.recovery_since,at_time); s.recovery_samples:=s.recovery_samples+1;
      if at_time-s.recovery_since >= make_interval(secs=>recover_seconds) and s.recovery_samples>=required_samples then
        update public.alarm_events set resolved_at=at_time where id=s.event_id;
        insert into public.alarm_audit(event_id,farm_id,action,occurred_at,detail) values(s.event_id,f,'resolved',at_time,details);
        update public.alarm_deliveries set status='cancelled' where event_id=s.event_id and status='pending';
        s.event_id:=null; s.breach_since:=null; s.recovery_since:=null; s.breach_samples:=0; s.recovery_samples:=0;
      end if;
    else s.recovery_since:=null; s.recovery_samples:=0;
    end if;
  end if;
  update private.alarm_condition_state set breach_since=s.breach_since,recovery_since=s.recovery_since,
    breach_samples=s.breach_samples,recovery_samples=s.recovery_samples,last_at=at_time,event_id=s.event_id
    where farm_id=f and device_id=d and code=c;
end $$;

create function private.evaluate_alarm_sample() returns trigger language plpgsql security invoker set search_path='' as $$
declare cfg public.alarm_settings%rowtype; source_at timestamptz; previous_at timestamptz;
  invalid_temp boolean; point record; details jsonb;
begin
  source_at:=coalesce(new.captured_at,new.recorded_at);
  -- Replayed, old and future-dated samples are historical evidence only.
  if new.replay or new.identity_mismatch or source_at < new.received_at-interval '30 seconds'
    or source_at > new.received_at+interval '30 seconds' then return new; end if;
  insert into private.alarm_device_clock(farm_id,device_id,last_live_at)
  values(new.farm_id,new.device_id,new.received_at) on conflict do nothing;
  select last_source_at into previous_at from private.alarm_device_clock
    where farm_id=new.farm_id and device_id=new.device_id for update;
  if previous_at is not null and source_at <= previous_at then return new; end if;
  update private.alarm_device_clock set last_live_at=new.received_at,last_source_at=source_at
    where farm_id=new.farm_id and device_id=new.device_id;
  select * into cfg from public.alarm_settings where house_id=new.house_id;
  if not found then return new; end if;
  details:=jsonb_build_object('temp_c',new.temp_c,'seq',new.seq,'boot_id',new.boot_id,'captured_at',new.captured_at,
    'warning_c',cfg.warning_c,'critical_c',cfg.critical_c);
  invalid_temp:=coalesce(new.sensor_fault,true) or new.temp_c is null or new.temp_c < -50 or new.temp_c > 100;
  perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,'controller_offline','critical',new.received_at,false,true,0,0,1,900,true,details);
  perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,'sensor_fault','critical',source_at,invalid_temp,not invalid_temp,0,0,2,1800,false,details);
  perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,'temperature_warning','warning',source_at,
    not invalid_temp and new.temp_c>=cfg.warning_c,not invalid_temp and new.temp_c<cfg.warning_c-1,300,300,1,1800,false,details);
  perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,'temperature_critical','critical',source_at,
    not invalid_temp and new.temp_c>=cfg.critical_c,not invalid_temp and new.temp_c<cfg.critical_c-1,120,300,1,600,true,details);
  perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,'cooling_unavailable','critical',source_at,
    not invalid_temp and new.temp_c>=cfg.warning_c and new.i7=false,
    new.i7=true or (not invalid_temp and new.temp_c<cfg.warning_c-1),120,
    case when not invalid_temp and new.temp_c<cfg.warning_c-1 then 0 else 120 end,1,600,true,details);
  for point in select * from (values ('cistern_i2',new.i2),('cistern_i3',new.i3),('cistern_i4',new.i4),('silo_i5',new.i5),('silo_i6',new.i6)) as p(code,value) loop
    perform private.advance_alarm(new.farm_id,new.house_id,new.device_id,point.code,'warning',source_at,
      point.value=false,point.value=true,300,300,1,3600,false,details||jsonb_build_object('input_full',point.value));
  end loop;
  return new;
end $$;
create trigger telemetry_evaluate_alarms after insert on public.telemetry for each row execute function private.evaluate_alarm_sample();

create function private.alarm_maintenance(reference_at timestamptz default now()) returns void
language plpgsql security invoker set search_path='' as $$
declare dev record;
begin
  insert into private.alarm_device_clock(farm_id,device_id,last_live_at)
  select farm_id,mqtt_client_id,reference_at from public.devices where enabled on conflict do nothing;
  for dev in select d.*,c.last_live_at from public.devices d join private.alarm_device_clock c
    on c.farm_id=d.farm_id and c.device_id=d.mqtt_client_id where d.enabled loop
    if dev.last_live_at <= reference_at-interval '5 minutes' then
      perform private.advance_alarm(dev.farm_id,dev.house_id,dev.mqtt_client_id,'controller_offline','critical',reference_at,
        true,false,0,0,1,900,true,jsonb_build_object('last_live_at',dev.last_live_at));
    end if;
  end loop;
  -- Queue only current repetition slots; never flood after worker downtime.
  insert into public.alarm_deliveries(event_id,farm_id,user_id,channel,repeat_slot,created_at)
  select e.id,e.farm_id,m.user_id,'push',floor(extract(epoch from reference_at-e.activated_at)/e.repeat_seconds)::integer,reference_at
  from public.alarm_events e join public.farm_members m on m.farm_id=e.farm_id and m.role in ('owner','admin','manager')
  where e.resolved_at is null and e.acknowledged_at is null and e.activated_at<=reference_at on conflict do nothing;
  insert into public.alarm_deliveries(event_id,farm_id,user_id,channel,repeat_slot,created_at)
  select e.id,e.farm_id,m.user_id,'email',0,reference_at
  from public.alarm_events e join public.farm_members m on m.farm_id=e.farm_id and m.role in ('owner','admin','manager')
  where e.resolved_at is null and e.acknowledged_at is null and e.email_fallback
    and e.activated_at<=reference_at-interval '10 minutes' on conflict do nothing;
  -- Retain only the current unsent repeat for each recipient; do not flood
  -- phones when a delivery worker returns after a prolonged interruption.
  update public.alarm_deliveries old set status='cancelled'
  where old.status='pending' and old.channel='push' and exists(
    select 1 from public.alarm_deliveries newer where newer.event_id=old.event_id
      and newer.user_id=old.user_id and newer.channel='push' and newer.repeat_slot>old.repeat_slot);
  update public.alarm_deliveries delivery set status='cancelled'
  where delivery.status='pending' and not exists(select 1 from public.farm_members m
    where m.farm_id=delivery.farm_id and m.user_id=delivery.user_id and m.role in ('owner','admin','manager'));
end $$;

create function public.acknowledge_alarm(target_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare evt public.alarm_events%rowtype;
begin
  select * into evt from public.alarm_events where id=target_event for update;
  if not found or auth.uid() is null or not private.is_farm_member(evt.farm_id) then
    raise exception 'Alarm access denied' using errcode='42501';
  end if;
  if evt.acknowledged_at is not null then return; end if;
  update public.alarm_events set acknowledged_at=now(),acknowledged_by=auth.uid() where id=target_event;
  insert into public.alarm_audit(event_id,farm_id,action,occurred_at,actor_id) values(target_event,evt.farm_id,'acknowledged',now(),auth.uid());
  update public.alarm_deliveries set status='cancelled' where event_id=target_event and status='pending';
end $$;
revoke all on function public.acknowledge_alarm(uuid) from public,anon;
grant execute on function public.acknowledge_alarm(uuid) to authenticated;

create function public.configure_alarm_temperature(target_house uuid,warning double precision,critical double precision) returns void
language plpgsql security definer set search_path='' as $$
declare prior public.alarm_settings%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.poultry_houses h join public.farm_members m on m.farm_id=h.farm_id
    where h.id=target_house and m.user_id=auth.uid() and m.role in ('owner','admin','manager')) then
    raise exception 'Alarm configuration access denied' using errcode='42501';
  end if;
  select * into prior from public.alarm_settings where house_id=target_house for update;
  update public.alarm_settings set warning_c=warning,critical_c=critical,updated_at=now() where house_id=target_house;
  insert into public.alarm_configuration_audit(house_id,farm_id,actor_id,old_values,new_values)
  values(target_house,prior.farm_id,auth.uid(),jsonb_build_object('warning_c',prior.warning_c,'critical_c',prior.critical_c),
    jsonb_build_object('warning_c',warning,'critical_c',critical));
  -- Changed thresholds require new duration evidence; active events keep their original snapshot.
  update private.alarm_condition_state s set breach_since=null,recovery_since=null,breach_samples=0,recovery_samples=0
  from public.devices d where d.house_id=target_house and s.farm_id=d.farm_id and s.device_id=d.mqtt_client_id;
end $$;
revoke all on function public.configure_alarm_temperature(uuid,double precision,double precision) from public,anon;
grant execute on function public.configure_alarm_temperature(uuid,double precision,double precision) to authenticated;
revoke all on function private.advance_alarm(uuid,uuid,text,text,text,timestamptz,boolean,boolean,integer,integer,integer,integer,boolean,jsonb),
  private.evaluate_alarm_sample(),private.alarm_maintenance(timestamptz) from public,anon,authenticated;

alter publication supabase_realtime add table public.alarm_events;
create extension if not exists pg_cron;
select cron.schedule('elmajd-alarm-maintenance','* * * * *','select private.alarm_maintenance();');
