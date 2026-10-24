-- Shared flock configuration and atomic production operations.
create table if not exists public.flock_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  chicken_count integer not null check (chicken_count >= 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.flock_settings enable row level security;

revoke all on public.flock_settings from anon, authenticated;
grant select, insert, update on public.flock_settings to authenticated;

drop policy if exists flock_settings_select_member on public.flock_settings;
create policy flock_settings_select_member on public.flock_settings for select to authenticated
using (private.is_farm_member(farm_id));

drop policy if exists flock_settings_insert_management on public.flock_settings;
create policy flock_settings_insert_management on public.flock_settings for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and private.has_farm_role(farm_id, array['owner','manager'])
);

drop policy if exists flock_settings_update_management on public.flock_settings;
create policy flock_settings_update_management on public.flock_settings for update to authenticated
using (private.has_farm_role(farm_id, array['owner','manager']))
with check (
  updated_by = (select auth.uid())
  and private.has_farm_role(farm_id, array['owner','manager'])
);

create or replace function private.set_flock_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists flock_settings_updated_at on public.flock_settings;
create trigger flock_settings_updated_at
before update on public.flock_settings
for each row execute function private.set_flock_updated_at();

alter table public.daily_production
  add column if not exists stock integer not null default 0 check (stock >= 0),
  add column if not exists sortie integer not null default 0 check (sortie >= 0),
  add column if not exists chicken_count integer check (chicken_count >= 0);

drop function if exists public.record_daily_production(uuid, date, integer, integer);

create or replace function public.record_daily_production(
  target_farm uuid,
  target_date date,
  stock_count integer,
  sortie_count integer,
  mortality_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  remaining_count integer;
  previous_stock integer;
  calculated_production integer;
  calculated_rate numeric(5,2);
  inserted_record public.daily_production;
begin
  if not private.has_farm_role(target_farm, array['owner','manager','worker']) then
    raise exception 'You do not have permission to save production for this farm.';
  end if;
  if stock_count < 0 or sortie_count < 0 or mortality_count < 0 then
    raise exception 'Stock, sortie, and mortality cannot be negative.';
  end if;

  select chicken_count into current_count
  from public.flock_settings
  where farm_id = target_farm
  for update;

  if not found then
    raise exception 'Configure the actual chicken count before saving production.';
  end if;
  if mortality_count > current_count then
    raise exception 'Mortality cannot exceed the actual chicken count.';
  end if;
  if exists (
    select 1 from public.daily_production
    where farm_id = target_farm and production_date = target_date
  ) then
    raise exception 'A production record already exists for this date. Delete it before entering a replacement.';
  end if;
  if exists (
    select 1 from public.daily_production
    where farm_id = target_farm and production_date > target_date
  ) then
    raise exception 'Production records must be entered in date order. Delete newer records before adding a past date.';
  end if;

  remaining_count := current_count - mortality_count;
  select stock into previous_stock
  from public.daily_production
  where farm_id = target_farm and production_date < target_date
  order by production_date desc
  limit 1;
  if not found then
    calculated_production := 0;
  else
    calculated_production := stock_count + sortie_count - previous_stock;
  end if;

  if calculated_production < 0 then
    raise exception 'Calculated production is negative. Check stock and sortie values.';
  end if;
  if remaining_count = 0 and calculated_production > 0 then
    raise exception 'Production cannot be recorded when no chickens remain.';
  end if;
  if remaining_count > 0 and calculated_production > remaining_count then
    raise exception 'Daily production cannot exceed the remaining chicken count.';
  end if;
  calculated_rate := case
    when remaining_count = 0 then 0
    else round((calculated_production::numeric / remaining_count::numeric) * 100, 2)
  end;

  update public.flock_settings
  set chicken_count = remaining_count,
      updated_by = auth.uid()
  where farm_id = target_farm;

  insert into public.daily_production (
    farm_id, production_date, eggs, mortality, production_rate,
    stock, sortie, chicken_count, submitted_by
  ) values (
    target_farm, target_date, calculated_production, mortality_count, calculated_rate,
    stock_count, sortie_count, remaining_count, auth.uid()
  ) returning * into inserted_record;

  return jsonb_build_object(
    'record', to_jsonb(inserted_record),
    'chicken_count', remaining_count
  );
end
$$;

create or replace function public.delete_daily_production(
  target_farm uuid,
  production_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_record public.daily_production;
  restored_count integer;
  previous_stock integer;
  next_record_id bigint;
  next_record_date date;
  next_production integer;
begin
  if not private.has_farm_role(target_farm, array['owner','manager']) then
    raise exception 'Only a farm owner or manager can delete production records.';
  end if;

  select * into deleted_record
  from public.daily_production
  where id = production_id and farm_id = target_farm
  for update;

  if not found then
    raise exception 'Production record not found.';
  end if;

  update public.flock_settings
  set chicken_count = chicken_count + deleted_record.mortality,
      updated_by = auth.uid()
  where farm_id = target_farm
  returning chicken_count into restored_count;

  if not found then
    raise exception 'Flock configuration not found.';
  end if;

  delete from public.daily_production where id = production_id;

  update public.daily_production
  set chicken_count = chicken_count + deleted_record.mortality,
      production_rate = case
        when chicken_count + deleted_record.mortality = 0 then 0
        else round((eggs::numeric / (chicken_count + deleted_record.mortality)::numeric) * 100, 2)
      end
  where farm_id = target_farm
    and production_date > deleted_record.production_date
    and chicken_count is not null;

  select id, production_date into next_record_id, next_record_date
  from public.daily_production
  where farm_id = target_farm and production_date > deleted_record.production_date
  order by production_date asc
  limit 1;

  if next_record_id is not null then
    select stock into previous_stock
    from public.daily_production
    where farm_id = target_farm and production_date < next_record_date
    order by production_date desc
    limit 1;

    if not found then
      next_production := 0;
    else
      select stock + sortie - previous_stock into next_production
      from public.daily_production where id = next_record_id;
    end if;

    if next_production < 0 then
      raise exception 'Deleting this record would make the following production negative.';
    end if;
    if next_production > (
      select chicken_count from public.daily_production where id = next_record_id
    ) then
      raise exception 'Deleting this record would make the following production exceed its chicken count.';
    end if;

    update public.daily_production
    set eggs = next_production,
        production_rate = case
          when chicken_count = 0 then 0
          else round((next_production::numeric / chicken_count::numeric) * 100, 2)
        end
    where id = next_record_id;
  end if;

  return jsonb_build_object(
    'deleted_id', production_id,
    'chicken_count', restored_count
  );
end
$$;

revoke all on function public.record_daily_production(uuid, date, integer, integer, integer) from public;
revoke all on function public.delete_daily_production(uuid, bigint) from public;
grant execute on function public.record_daily_production(uuid, date, integer, integer, integer) to authenticated;
grant execute on function public.delete_daily_production(uuid, bigint) to authenticated;
