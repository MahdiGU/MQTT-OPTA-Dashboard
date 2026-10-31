-- Mailbox credentials remain in Vault, never exposed to application users.
create function public.gmail_worker_config() returns jsonb language sql security definer set search_path='' as $$
  select (select decrypted_secret::jsonb from vault.decrypted_secrets where name='elmajd_gmail_oauth')
$$;
revoke all on function public.gmail_worker_config() from public,anon,authenticated;
grant execute on function public.gmail_worker_config() to service_role;

create table public.email_delivery_attempts (
  id bigint generated always as identity primary key,
  delivery_id uuid not null references public.alarm_deliveries(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('sent','retry','failed')),
  provider_message_id text,error_code text,created_at timestamptz not null default now()
);
create index email_attempts_delivery_idx on public.email_delivery_attempts(delivery_id);
create index email_attempts_farm_user_idx on public.email_delivery_attempts(farm_id,user_id);
alter table public.email_delivery_attempts enable row level security;
revoke all on public.email_delivery_attempts from anon,authenticated;
grant select on public.email_delivery_attempts to authenticated;
create policy email_attempts_own on public.email_delivery_attempts for select to authenticated
  using(user_id=(select auth.uid()) and private.is_farm_member(farm_id));

create function public.claim_email_deliveries() returns jsonb language plpgsql security definer set search_path='' as $$
declare item record; jobs jsonb:='[]'; lease uuid;
begin
  perform private.alarm_maintenance();
  for item in select d.*,e.code,e.severity,e.activated_at,e.resolved_at,e.acknowledged_at,u.email,u.email_confirmed_at,u.banned_until,
    coalesce((select p.language_code from public.push_devices p where p.user_id=d.user_id order by p.last_seen_at desc limit 1),'fr') as language
    from public.alarm_deliveries d join public.alarm_events e on e.id=d.event_id join auth.users u on u.id=d.user_id
    where d.channel='email' and d.status='pending' and d.next_attempt_at<=now() and (d.lease_until is null or d.lease_until<now())
    order by d.created_at limit 5 for update of d skip locked
  loop
    if item.resolved_at is not null or item.acknowledged_at is not null or item.email_confirmed_at is null or item.banned_until>now()
      or not exists(select 1 from public.farm_members where farm_id=item.farm_id and user_id=item.user_id and role in ('owner','manager')) then
      update public.alarm_deliveries set status='cancelled',lease_id=null,lease_until=null where id=item.id;continue;
    end if;
    lease:=gen_random_uuid();
    update public.alarm_deliveries set lease_id=lease,lease_until=now()+interval '3 minutes',attempts=attempts+1 where id=item.id;
    jobs:=jobs||jsonb_build_array(jsonb_build_object('id',item.id,'lease_id',lease,'event_id',item.event_id,'recipient_id',item.user_id,
      'email',item.email,'language',item.language,'code',item.code,'severity',item.severity,'activated_at',item.activated_at));
  end loop;
  return jobs;
end $$;
create function public.email_target_authorized(delivery uuid,lease uuid,recipient_email text) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from public.alarm_deliveries d join public.alarm_events e on e.id=d.event_id
  join auth.users u on u.id=d.user_id join public.farm_members m on m.farm_id=d.farm_id and m.user_id=d.user_id
  where d.id=delivery and d.channel='email' and d.lease_id=lease and d.status='pending' and d.lease_until>now()
    and e.resolved_at is null and e.acknowledged_at is null and m.role in ('owner','manager')
    and u.email=recipient_email and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now()))
$$;
create function public.finish_email_delivery(delivery uuid,lease uuid,result jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare d public.alarm_deliveries%rowtype; outcome text:=result->>'status';
begin
  if outcome is null or outcome not in ('sent','retry','failed') then raise exception 'Invalid mail outcome';end if;
  select * into d from public.alarm_deliveries where id=delivery and channel='email' and lease_id=lease and status='pending' for update;
  if not found then return;end if;
  insert into public.email_delivery_attempts(delivery_id,farm_id,user_id,status,provider_message_id,error_code)
    values(d.id,d.farm_id,d.user_id,outcome,left(result->>'provider_message_id',200),left(result->>'error_code',100));
  update public.alarm_deliveries set lease_id=null,lease_until=null,
    status=case when outcome='retry' and d.attempts<6 then 'pending' when outcome='sent' then 'sent' else 'failed' end,
    sent_at=case when outcome='sent' then now() else null end,last_error=left(result->>'error_code',100),
    next_attempt_at=now()+make_interval(secs=>least(1800,30*power(2,least(d.attempts,6))::integer)) where id=d.id;
end $$;
revoke all on function public.claim_email_deliveries(),public.email_target_authorized(uuid,uuid,text),public.finish_email_delivery(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_email_deliveries(),public.email_target_authorized(uuid,uuid,text),public.finish_email_delivery(uuid,uuid,jsonb) to service_role;

create table private.recovery_requests (email_hash text not null,requested_at timestamptz not null default now());
create index recovery_requests_email_time_idx on private.recovery_requests(email_hash,requested_at);
alter table private.recovery_requests enable row level security;
revoke all on private.recovery_requests from public,anon,authenticated;
create function public.reserve_account_recovery(normalized_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare hashed text:=encode(extensions.digest(normalized_email,'sha256'),'hex');
begin
  perform pg_advisory_xact_lock(hashtextextended(hashed,0));
  delete from private.recovery_requests where requested_at<now()-interval '1 day';
  if exists(select 1 from private.recovery_requests where email_hash=hashed and requested_at>now()-interval '1 minute')
    or (select count(*) from private.recovery_requests where email_hash=hashed and requested_at>now()-interval '1 hour')>=3 then return false;end if;
  insert into private.recovery_requests(email_hash) values(hashed);return true;
end $$;
create function public.account_recovery_recipient(normalized_email text) returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object('email',u.email,'language',coalesce((select p.language_code from public.push_devices p where p.user_id=u.id order by p.last_seen_at desc limit 1),'fr'))
from auth.users u where lower(u.email)=normalized_email and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
  and exists(select 1 from public.farm_members m where m.user_id=u.id and m.role in ('owner','manager')) limit 1
$$;
revoke all on function public.reserve_account_recovery(text),public.account_recovery_recipient(text) from public,anon,authenticated;
grant execute on function public.reserve_account_recovery(text),public.account_recovery_recipient(text) to service_role;
