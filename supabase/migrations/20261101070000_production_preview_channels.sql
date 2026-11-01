-- Read-only preview uses the same historical rules as the write RPCs.
create function public.preview_daily_production(target_farm uuid,target_date date,stock_count integer,sortie_count integer,mortality_count integer,production_id bigint default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare current_count bigint; base_count bigint; delta bigint; prior_stock integer; prior_date date;
  prior public.daily_production%rowtype; following public.daily_production%rowtype;
  eggs bigint; remaining bigint; problem text; problem_date date;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then
    raise exception 'Production permission denied' using errcode='42501';end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or stock_count is null or sortie_count is null or mortality_count is null
    or least(stock_count,sortie_count,mortality_count)<0 then raise exception 'Enter a valid date and nonnegative Stock, Sortie and mortality.';end if;
  select chicken_count into current_count from public.flock_settings where farm_id=target_farm;
  if current_count is null then return jsonb_build_object('valid',false,'error','flock_missing');end if;
  select production_date into problem_date from public.daily_production where farm_id=target_farm
    and (stock is null or sortie is null or chicken_count is null) order by production_date limit 1;
  if problem_date is not null then return jsonb_build_object('valid',false,'error','historical_incomplete','affected_date',problem_date);end if;
  if production_id is not null then
    select * into prior from public.daily_production where farm_id=target_farm and id=production_id;
    if not found or prior.production_date<>target_date then raise exception 'Production record not found.';end if;
    base_count:=prior.chicken_count::bigint+prior.mortality;delta:=mortality_count::bigint-prior.mortality;
  else
    if exists(select 1 from public.daily_production where farm_id=target_farm and production_date=target_date) then
      return jsonb_build_object('valid',false,'error','date_exists');end if;
    delta:=mortality_count;
  end if;
  select stock,production_date into prior_stock,prior_date from public.daily_production
    where farm_id=target_farm and production_date<target_date order by production_date desc limit 1;
  select * into following from public.daily_production where farm_id=target_farm and production_date>target_date order by production_date limit 1;
  if production_id is null then base_count:=coalesce(following.chicken_count::bigint+following.mortality,current_count);end if;
  remaining:=base_count-mortality_count;
  eggs:=case when prior_stock is null then 0 else stock_count::bigint+sortie_count-prior_stock end;
  if remaining<0 or current_count-delta<0 then problem:='mortality_exceeds_flock';
  elsif eggs<0 then problem:='negative_production';
  elsif eggs>remaining then problem:='production_exceeds_flock';
  end if;
  if problem is null then
    -- Only the immediate following record changes its stock predecessor. Every
    -- later flock snapshot changes by the mortality delta.
    select p.production_date into problem_date from public.daily_production p
      where p.farm_id=target_farm and p.production_date>target_date
      and (p.chicken_count::bigint-delta<0 or
        case when p.id=following.id then p.stock::bigint+p.sortie-stock_count else p.eggs::bigint end
          not between 0 and p.chicken_count::bigint-delta)
      order by p.production_date limit 1;
    if problem_date is not null then problem:='dependent_record_invalid';end if;
  end if;
  return jsonb_build_object('valid',problem is null,'error',problem,'affected_date',problem_date,'date',target_date,
    'first_record',prior_stock is null,'previous_date',prior_date,'previous_stock',prior_stock,'eggs',eggs,
    'remaining_flock',remaining,'production_rate',case when remaining>0 then round(eggs::numeric/remaining*100,2) else 0 end,
    'cartons_used',ceil(greatest(0,eggs)::numeric*11/300));
end $$;
revoke all on function public.preview_daily_production(uuid,date,integer,integer,integer,bigint) from public,anon;
grant execute on function public.preview_daily_production(uuid,date,integer,integer,integer,bigint) to authenticated;

-- Return readiness metadata only; credentials stay server-only in Vault.
create function public.notification_channels_status(target_farm uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_farm_member(target_farm) then raise exception 'Farm access denied' using errcode='42501';end if;
  return jsonb_build_object('gmail_configured',exists(select 1 from vault.secrets where name='elmajd_gmail_oauth'),
    'push_configured',exists(select 1 from vault.secrets where name='elmajd_fcm_service_account'));
end $$;
revoke all on function public.notification_channels_status(uuid) from public,anon;
grant execute on function public.notification_channels_status(uuid) to authenticated;
