create table public.flock_adjustments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  effective_date date not null,
  category text not null check(category in ('reference','initial','received','transfer_in','transfer_out','correction')),
  delta integer not null,previous_count integer not null check(previous_count>=0),new_count integer not null check(new_count>=0),
  note text not null default '' check(length(note)<=500),
  submitted_by uuid references auth.users(id),request_id uuid not null,created_at timestamptz not null default now(),
  unique(farm_id,request_id)
);
create index flock_adjustments_farm_date_idx on public.flock_adjustments(farm_id,effective_date);
create index flock_adjustments_actor_idx on public.flock_adjustments(submitted_by);
alter table public.flock_adjustments enable row level security;
revoke all on public.flock_adjustments from anon,authenticated;
grant select on public.flock_adjustments to authenticated;
create policy flock_adjustments_read on public.flock_adjustments for select to authenticated using(private.is_farm_member(farm_id));
-- Reference captures the migration-time count. It is not an additional movement.
insert into public.flock_adjustments(farm_id,effective_date,category,delta,previous_count,new_count,note,request_id)
select farm_id,(now() at time zone 'Etc/GMT-1')::date,'reference',0,chicken_count,chicken_count,'Imported current-count reference; existing production snapshots preserved.',gen_random_uuid() from public.flock_settings;

create function public.record_flock_adjustment(target_farm uuid,target_date date,target_count integer,adjustment_category text,adjustment_note text,request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_count integer;change_count bigint;saved public.flock_adjustments%rowtype;entry uuid;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Flock adjustment permission denied' using errcode='42501';end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or target_count is null or target_count<0 or request_key is null
    or adjustment_category is null or adjustment_category not in ('initial','received','transfer_in','transfer_out','correction')
    or length(coalesce(adjustment_note,''))>500 then raise exception 'Enter a valid dated flock adjustment.';end if;
  if adjustment_category='correction' and nullif(trim(adjustment_note),'') is null then raise exception 'A correction reason is required.';end if;
  -- Serialize initialization and subsequent changes, including retries.
  perform pg_advisory_xact_lock(hashtextextended(target_farm::text,814));
  select * into saved from public.flock_adjustments where farm_id=target_farm and request_id=request_key;
  if found then
    if saved.effective_date<>target_date or saved.new_count<>target_count or saved.category<>adjustment_category or saved.note<>coalesce(adjustment_note,'') then raise exception 'Flock request ID reused with different values.';end if;
    return jsonb_build_object('id',saved.id,'chicken_count',saved.new_count,'delta',saved.delta);
  end if;
  select chicken_count into current_count from public.flock_settings where farm_id=target_farm for update;
  if current_count is null then
    if adjustment_category<>'initial' or exists(select 1 from public.daily_production where farm_id=target_farm) then raise exception 'Initialize the flock before recording production.';end if;
    current_count:=0;
    insert into public.flock_settings(farm_id,chicken_count,updated_by) values(target_farm,0,auth.uid());
  elsif adjustment_category='initial' then raise exception 'The flock is already initialized. Use a dated adjustment.';
  end if;
  change_count:=target_count::bigint-current_count;
  if adjustment_category in ('received','transfer_in') and change_count<=0 then raise exception 'Received birds must increase the current flock.';end if;
  if adjustment_category='transfer_out' and change_count>=0 then raise exception 'Transferred birds must decrease the current flock.';end if;
  if exists(select 1 from public.daily_production where farm_id=target_farm and production_date>=target_date
    and (chicken_count::bigint+change_count<0 or chicken_count::bigint+change_count>2147483647)) then raise exception 'Adjustment makes a historical flock count invalid.';end if;
  insert into public.flock_adjustments(farm_id,effective_date,category,delta,previous_count,new_count,note,submitted_by,request_id)
    values(target_farm,target_date,adjustment_category,change_count,current_count,target_count,coalesce(adjustment_note,''),auth.uid(),request_key) returning id into entry;
  update public.daily_production set chicken_count=chicken_count+change_count where farm_id=target_farm and production_date>=target_date;
  update public.flock_settings set chicken_count=target_count,updated_by=auth.uid() where farm_id=target_farm;
  perform private.recalculate_production(target_farm);
  return jsonb_build_object('id',entry,'chicken_count',target_count,'delta',change_count);
end $$;
revoke all on function public.record_flock_adjustment(uuid,date,integer,text,text,uuid) from public,anon;
grant execute on function public.record_flock_adjustment(uuid,date,integer,text,text,uuid) to authenticated;
revoke insert,update,delete on public.flock_settings from authenticated,anon;

-- Historical insertion must remove movements occurring after the production day.
create or replace function public.record_daily_production(target_farm uuid,target_date date,stock_count integer,sortie_count integer,mortality_count integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_count integer;date_count bigint;following_day date;new_id bigint;saved public.daily_production%rowtype;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Production permission denied' using errcode='42501';end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or stock_count is null or sortie_count is null or mortality_count is null
    or least(stock_count,sortie_count,mortality_count)<0 then raise exception 'Enter a valid date and nonnegative Stock, Sortie and mortality.';end if;
  select chicken_count into current_count from public.flock_settings where farm_id=target_farm for update;
  if not found then raise exception 'Configure the flock first.';end if;
  if exists(select 1 from public.flock_adjustments where farm_id=target_farm and category='initial' and effective_date>target_date) then raise exception 'Production date precedes the initial flock date.';end if;
  select chicken_count::bigint+mortality,production_date into date_count,following_day from public.daily_production
    where farm_id=target_farm and production_date>target_date order by production_date limit 1;
  date_count:=coalesce(date_count,current_count)-coalesce((select sum(a.delta) from public.flock_adjustments a
    where a.farm_id=target_farm and a.effective_date>target_date and (following_day is null or a.effective_date<=following_day)),0);
  if date_count<0 or date_count>2147483647 or mortality_count>least(current_count,date_count) then raise exception 'Mortality exceeds available flock.';end if;
  insert into public.daily_production(farm_id,production_date,stock,sortie,mortality,eggs,production_rate,chicken_count,submitted_by)
    values(target_farm,target_date,stock_count,sortie_count,mortality_count,0,0,date_count-mortality_count,auth.uid()) returning id into new_id;
  update public.daily_production set chicken_count=chicken_count-mortality_count where farm_id=target_farm and production_date>target_date;
  update public.flock_settings set chicken_count=current_count-mortality_count,updated_by=auth.uid() where farm_id=target_farm;
  perform private.recalculate_production(target_farm);
  select * into saved from public.daily_production where id=new_id;
  return jsonb_build_object('record',to_jsonb(saved),'chicken_count',current_count-mortality_count);
end $$;
alter publication supabase_realtime add table public.flock_adjustments;
-- Read-only preview uses the same historical rules as the write RPCs.
create or replace function public.preview_daily_production(target_farm uuid,target_date date,stock_count integer,sortie_count integer,mortality_count integer,production_id bigint default null)
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
  if exists(select 1 from public.flock_adjustments where farm_id=target_farm and category='initial' and effective_date>target_date) then return jsonb_build_object('valid',false,'error','flock_not_started');end if;
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
  if production_id is null then
    base_count:=coalesce(following.chicken_count::bigint+following.mortality,current_count)-coalesce((select sum(a.delta) from public.flock_adjustments a
      where a.farm_id=target_farm and a.effective_date>target_date and (following.production_date is null or a.effective_date<=following.production_date)),0);
  end if;
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


