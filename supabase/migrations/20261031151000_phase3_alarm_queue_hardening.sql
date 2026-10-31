-- Queue initial push atomically with activation, without waiting for cron.
create function private.queue_initial_alarm_push() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  insert into public.alarm_deliveries(event_id,farm_id,user_id,channel,repeat_slot,created_at)
  select new.id,new.farm_id,m.user_id,'push',0,new.activated_at
  from public.farm_members m where m.farm_id=new.farm_id and m.role in ('owner','admin','manager')
  on conflict do nothing;
  return new;
end $$;
revoke all on function private.queue_initial_alarm_push() from public,anon,authenticated;
create trigger alarm_initial_push after insert on public.alarm_events for each row execute function private.queue_initial_alarm_push();

create index alarm_condition_event_idx on private.alarm_condition_state(event_id);
revoke all on private.alarm_condition_state,private.alarm_device_clock from anon,authenticated;
create policy alarm_condition_server_only on private.alarm_condition_state to service_role using(true) with check(true);
create policy alarm_clock_server_only on private.alarm_device_clock to service_role using(true) with check(true);
