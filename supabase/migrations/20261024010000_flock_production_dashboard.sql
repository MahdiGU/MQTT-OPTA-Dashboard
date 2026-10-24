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

create or replace function public.record_daily_production(
  target_farm uuid,
  target_date date,
  egg_count integer,
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
  calculated_rate numeric(5,2);
  inserted_record public.daily_production;
begin
  if not private.has_farm_role(target_farm, array['owner','manager','worker']) then
    raise exception 'You do not have permission to save production for this farm.';
  end if;
  if egg_count < 0 or mortality_count < 0 then
    raise exception 'Production and mortality cannot be negative.';
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

  remaining_count := current_count - mortality_count;
  if remaining_count = 0 and egg_count > 0 then
    raise exception 'Production cannot be recorded when no chickens remain.';
  end if;
  if remaining_count > 0 and egg_count > remaining_count then
    raise exception 'Daily production cannot exceed the remaining chicken count.';
  end if;
  calculated_rate := case
    when remaining_count = 0 then 0
    else round((egg_count::numeric / remaining_count::numeric) * 100, 2)
  end;

  update public.flock_settings
  set chicken_count = remaining_count,
      updated_by = auth.uid()
  where farm_id = target_farm;

  insert into public.daily_production (
    farm_id, production_date, eggs, mortality, production_rate, submitted_by
  ) values (
    target_farm, target_date, egg_count, mortality_count, calculated_rate, auth.uid()
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

  return jsonb_build_object(
    'deleted_id', production_id,
    'chicken_count', restored_count
  );
end
$$;

revoke all on function public.record_daily_production(uuid, date, integer, integer) from public;
revoke all on function public.delete_daily_production(uuid, bigint) from public;
grant execute on function public.record_daily_production(uuid, date, integer, integer) to authenticated;
grant execute on function public.delete_daily_production(uuid, bigint) to authenticated;
