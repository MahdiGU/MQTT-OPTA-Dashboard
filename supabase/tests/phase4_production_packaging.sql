begin;
do $$
declare f uuid; u uuid; first_id bigint; middle_id bigint; request_id uuid:=gen_random_uuid();
begin
  select farm_id,user_id into f,u from public.farm_members where role='owner' limit 1;
  perform set_config('request.jwt.claim.sub',u::text,true);
  delete from public.daily_production where farm_id=f;
  delete from public.carton_receipts where farm_id=f;
  insert into public.flock_settings(farm_id,chicken_count,updated_by) values(f,1000,u)
    on conflict(farm_id) do update set chicken_count=1000;
  perform public.record_daily_production(f,current_date-10,1000,0,2);
  if (select eggs from public.daily_production where farm_id=f limit 1)<>0 then raise exception 'First record must be zero'; end if;
  perform public.record_daily_production(f,current_date-8,1500,100,3);
  if not exists(select 1 from public.daily_production where farm_id=f and production_date=current_date-8 and eggs=600 and cartons_used=22) then raise exception 'Formula/rounding failed'; end if;
  perform public.record_daily_production(f,current_date-9,1300,100,1);
  select id into first_id from public.daily_production where farm_id=f and production_date=current_date-10;
  select id into middle_id from public.daily_production where farm_id=f and production_date=current_date-9;
  update public.farm_members set role='manager' where farm_id=f and user_id=u;
  perform public.edit_daily_production(f,first_id,1200,0,1);
  if (select chicken_count from public.flock_settings where farm_id=f)<>995 then raise exception 'Edit mortality adjustment failed'; end if;
  if not exists(select 1 from public.daily_production where id=middle_id and eggs=200 and cartons_used=8) then raise exception 'Dependent recalculation failed'; end if;
  begin
    perform public.delete_daily_production(f,middle_id);
    raise exception 'Manager deletion permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.edit_daily_production(f,middle_id,999999,0,1);
    raise exception 'Invalid correction accepted';
  exception when raise_exception then
    if sqlerrm='Invalid correction accepted' then raise; end if;
  end;
  if not exists(select 1 from public.daily_production where id=middle_id and stock=1300) then raise exception 'Failed correction not atomic'; end if;
  perform public.record_carton_receipt(f,current_date,100,'test receipt',request_id);
  perform public.record_carton_receipt(f,current_date,100,'test receipt',request_id);
  if (select count(*) from public.carton_receipts where farm_id=f)<>1 then raise exception 'Duplicate receipt'; end if;
  update public.farm_members set role='owner' where farm_id=f and user_id=u;
  perform public.delete_daily_production(f,middle_id);
  if (select chicken_count from public.flock_settings where farm_id=f)<>996 then raise exception 'Delete mortality restore failed'; end if;
  -- A receipt today is an opening reference; earlier production is excluded.
  if (select balance from public.carton_balance where farm_id=f)<>100 then raise exception 'Carton opening balance failed'; end if;
  if not exists(select 1 from public.production_audit where farm_id=f and action='DELETE') then raise exception 'Delete audit missing'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.record_carton_receipt(f,current_date,1,'denied',gen_random_uuid());
    raise exception 'Cross-farm receipt permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'PASS: first record, missing day, historical insert/edit/delete, mortality, manager restrictions, carton allowance/receipts/idempotency, atomic rollback, audit, cross-farm denial' as phase4_result;
rollback;
