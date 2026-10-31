-- Keep legacy RPC names compatible with installed apps; edits use a new RPC.
alter table public.daily_production add column cartons_used integer generated always as (ceil(eggs::numeric*11/300)::integer) stored;
create table public.production_audit (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  before_value jsonb,
  after_value jsonb,
  occurred_at timestamptz not null default now()
);
create index production_audit_farm_idx on public.production_audit(farm_id,occurred_at desc);
create index production_audit_actor_idx on public.production_audit(actor_id);
alter table public.production_audit enable row level security;
revoke all on public.production_audit from anon,authenticated;
grant select on public.production_audit to authenticated;
create policy production_audit_read on public.production_audit for select to authenticated using(private.is_farm_member(farm_id));

create function private.audit_production_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.production_audit(farm_id,actor_id,action,entity,before_value,after_value)
  values(coalesce(new.farm_id,old.farm_id),auth.uid(),tg_op,tg_table_name,
    case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function private.audit_production_change() from public,anon,authenticated;
create trigger production_audit_change after insert or update or delete on public.daily_production for each row execute function private.audit_production_change();
create trigger flock_audit_change after insert or update on public.flock_settings for each row execute function private.audit_production_change();

create table public.carton_receipts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  receipt_date date not null default ((now() at time zone 'Etc/GMT-1')::date),
  quantity integer not null check(quantity>0),
  note text not null default '' check(length(note)<=500),
  submitted_by uuid not null references auth.users(id),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique(farm_id,request_id)
);
create index carton_receipts_farm_date_idx on public.carton_receipts(farm_id,receipt_date);
create index carton_receipts_user_idx on public.carton_receipts(submitted_by);
alter table public.carton_receipts enable row level security;
revoke all on public.carton_receipts from anon,authenticated;
grant select on public.carton_receipts to authenticated;
create policy carton_receipts_read on public.carton_receipts for select to authenticated using(private.is_farm_member(farm_id));
create trigger carton_receipt_audit after insert on public.carton_receipts for each row execute function private.audit_production_change();

-- All writes go through RPC validation; prevent bypass of formula and roles.
revoke insert,update,delete on public.daily_production from authenticated,anon;

create function private.recalculate_production(target_farm uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare row_data record; prior_stock integer; computed bigint; rate numeric;
begin
  for row_data in select * from public.daily_production where farm_id=target_farm order by production_date,id for update loop
    if row_data.stock is null or row_data.sortie is null or row_data.chicken_count is null then
      raise exception 'A historical record needs Stock, Sortie and flock values before correction.';
    end if;
    computed:=case when prior_stock is null then 0 else row_data.stock::bigint+row_data.sortie-prior_stock end;
    if computed<0 or computed>row_data.chicken_count then
      raise exception 'Correction makes production invalid on %: production %, remaining flock %.',row_data.production_date,computed,row_data.chicken_count;
    end if;
    rate:=case when row_data.chicken_count=0 then 0 else round(computed::numeric/row_data.chicken_count*100,2) end;
    if row_data.eggs is distinct from computed or row_data.production_rate is distinct from rate then
      update public.daily_production set eggs=computed,production_rate=rate where id=row_data.id;
    end if;
    prior_stock:=row_data.stock;
  end loop;
end $$;
revoke all on function private.recalculate_production(uuid) from public,anon,authenticated;

create or replace function public.record_daily_production(target_farm uuid,target_date date,stock_count integer,sortie_count integer,mortality_count integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_count integer; date_count integer; new_id bigint; saved public.daily_production%rowtype;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Production permission denied' using errcode='42501'; end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or stock_count is null or sortie_count is null or mortality_count is null
    or least(stock_count,sortie_count,mortality_count)<0 then raise exception 'Enter a valid date and nonnegative Stock, Sortie and mortality.'; end if;
  select chicken_count into current_count from public.flock_settings where farm_id=target_farm for update;
  if not found then raise exception 'Configure the flock first.'; end if;
  select chicken_count+mortality into date_count from public.daily_production where farm_id=target_farm and production_date>target_date order by production_date limit 1;
  date_count:=coalesce(date_count,current_count);
  if mortality_count>least(current_count,date_count) then raise exception 'Mortality exceeds available flock.'; end if;
  insert into public.daily_production(farm_id,production_date,stock,sortie,mortality,eggs,production_rate,chicken_count,submitted_by)
    values(target_farm,target_date,stock_count,sortie_count,mortality_count,0,0,date_count-mortality_count,auth.uid()) returning id into new_id;
  update public.daily_production set chicken_count=chicken_count-mortality_count where farm_id=target_farm and production_date>target_date;
  update public.flock_settings set chicken_count=current_count-mortality_count,updated_by=auth.uid() where farm_id=target_farm;
  perform private.recalculate_production(target_farm);
  select * into saved from public.daily_production where id=new_id;
  return jsonb_build_object('record',to_jsonb(saved),'chicken_count',current_count-mortality_count);
end $$;

create function public.edit_daily_production(target_farm uuid,production_id bigint,stock_count integer,sortie_count integer,mortality_count integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior public.daily_production%rowtype; current_count integer; delta integer;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Production edit permission denied' using errcode='42501'; end if;
  if stock_count is null or sortie_count is null or mortality_count is null or least(stock_count,sortie_count,mortality_count)<0 then raise exception 'Enter nonnegative whole numbers.'; end if;
  select chicken_count into current_count from public.flock_settings where farm_id=target_farm for update;
  select * into prior from public.daily_production where farm_id=target_farm and id=production_id for update;
  if not found then raise exception 'Production record not found.'; end if;
  delta:=mortality_count-prior.mortality;
  if current_count-delta<0 or exists(select 1 from public.daily_production where farm_id=target_farm and production_date>=prior.production_date and chicken_count-delta<0) then raise exception 'Mortality exceeds available flock.'; end if;
  update public.daily_production set stock=stock_count,sortie=sortie_count,mortality=mortality_count where id=production_id;
  update public.daily_production set chicken_count=chicken_count-delta where farm_id=target_farm and production_date>=prior.production_date;
  update public.flock_settings set chicken_count=current_count-delta,updated_by=auth.uid() where farm_id=target_farm;
  perform private.recalculate_production(target_farm);
  return jsonb_build_object('updated_id',production_id,'chicken_count',current_count-delta);
end $$;

create or replace function public.delete_daily_production(target_farm uuid,production_id bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior public.daily_production%rowtype; restored integer;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner']) then raise exception 'Only the owner/admin may delete production.' using errcode='42501'; end if;
  perform 1 from public.flock_settings where farm_id=target_farm for update;
  select * into prior from public.daily_production where farm_id=target_farm and id=production_id for update;
  if not found then raise exception 'Production record not found.'; end if;
  delete from public.daily_production where id=production_id;
  update public.daily_production set chicken_count=chicken_count+prior.mortality where farm_id=target_farm and production_date>prior.production_date;
  update public.flock_settings set chicken_count=chicken_count+prior.mortality,updated_by=auth.uid() where farm_id=target_farm returning chicken_count into restored;
  perform private.recalculate_production(target_farm);
  return jsonb_build_object('deleted_id',production_id,'chicken_count',restored);
end $$;

create function public.record_carton_receipt(target_farm uuid,target_date date,carton_count integer,receipt_note text,request_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare receipt uuid;
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Carton receipt permission denied' using errcode='42501'; end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or carton_count is null or carton_count<=0 or request_key is null then raise exception 'Enter a valid receipt date and positive whole carton count.'; end if;
  insert into public.carton_receipts(farm_id,receipt_date,quantity,note,submitted_by,request_id)
  values(target_farm,target_date,carton_count,coalesce(receipt_note,''),auth.uid(),request_key)
  on conflict(farm_id,request_id) do nothing returning id into receipt;
  if receipt is null then
    select id into receipt from public.carton_receipts where farm_id=target_farm and request_id=request_key and receipt_date=target_date and quantity=carton_count and note=coalesce(receipt_note,'');
    if receipt is null then raise exception 'Receipt request ID reused with different values.'; end if;
  end if;
  return receipt;
end $$;

create view public.carton_balance with(security_invoker=true) as
select f.id as farm_id,
  coalesce((select sum(quantity) from public.carton_receipts r where r.farm_id=f.id),0) as received,
  coalesce((select sum(cartons_used) from public.daily_production p where p.farm_id=f.id),0) as consumed,
  coalesce((select sum(quantity) from public.carton_receipts r where r.farm_id=f.id),0)-coalesce((select sum(cartons_used) from public.daily_production p where p.farm_id=f.id),0) as balance
from public.farms f;
grant select on public.carton_balance to authenticated;
revoke all on function public.record_daily_production(uuid,date,integer,integer,integer),public.edit_daily_production(uuid,bigint,integer,integer,integer),public.delete_daily_production(uuid,bigint),public.record_carton_receipt(uuid,date,integer,text,uuid) from public,anon;
grant execute on function public.record_daily_production(uuid,date,integer,integer,integer),public.edit_daily_production(uuid,bigint,integer,integer,integer),public.delete_daily_production(uuid,bigint),public.record_carton_receipt(uuid,date,integer,text,uuid) to authenticated;
alter publication supabase_realtime add table public.carton_receipts;
