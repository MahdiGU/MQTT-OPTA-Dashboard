begin;
do $$
declare f uuid; u uuid; opening uuid; extra uuid; stock record;
begin
  select farm_id,user_id into f,u from public.farm_members where role='owner' limit 1;
  perform set_config('request.jwt.claim.sub',u::text,true);
  delete from public.carton_receipts where farm_id=f;
  delete from public.daily_production where farm_id=f;
  insert into public.daily_production(farm_id,production_date,eggs,mortality,production_rate,stock,sortie,chicken_count,submitted_by)
  values(f,current_date-4,300,0,30,100,0,1000,u),(f,current_date-3,300,0,30,400,0,1000,u),
    (f,current_date-2,60,0,6,460,0,1000,u),(f,current_date-1,300,0,30,760,0,1000,u);
  select * into stock from public.calculate_carton_inventory(f);
  if stock.balance<>0 or stock.consumed<>0 or stock.reference_date is not null then raise exception 'Uninitialized inventory not zero'; end if;
  opening:=public.record_carton_receipt(f,current_date-3,10,'opening',gen_random_uuid());
  select * into stock from public.calculate_carton_inventory(f);
  if stock.consumed<>14 or stock.balance<>0 or stock.shortfall<>4 then raise exception 'Opening day exclusion or zero floor failed: %',to_jsonb(stock); end if;
  extra:=public.record_carton_receipt(f,current_date,5,'new delivery',gen_random_uuid());
  select * into stock from public.calculate_carton_inventory(f);
  if stock.balance<>5 then raise exception 'Past shortage incorrectly consumed later delivery'; end if;
  update public.farm_members set role='manager' where farm_id=f and user_id=u;
  perform public.edit_carton_receipt(f,opening,current_date-3,20,'corrected');
  select * into stock from public.calculate_carton_inventory(f);
  if stock.balance<>11 or stock.shortfall<>0 then raise exception 'Receipt correction failed'; end if;
  begin
    perform public.delete_carton_receipt(f,extra);raise exception 'Manager could delete';
  exception when insufficient_privilege then null;end;
  update public.farm_members set role='owner' where farm_id=f and user_id=u;
  perform public.delete_carton_receipt(f,opening);
  select * into stock from public.calculate_carton_inventory(f);
  if stock.balance<>5 or stock.reference_date<>current_date or stock.consumed<>0 then raise exception 'Reference deletion failed'; end if;
  perform public.delete_carton_receipt(f,extra);
  select * into stock from public.calculate_carton_inventory(f);
  if stock.balance<>0 or stock.reference_date is not null then raise exception 'Empty inventory reset failed'; end if;
  if not exists(select 1 from public.production_audit where farm_id=f and entity='carton_receipts' and action='DELETE') then raise exception 'Delete audit missing'; end if;
end $$;
select 'PASS: opening reference, next-day counting, zero floor, shortages, later deliveries, manager edit/deny delete, owner delete, audit' as result;
rollback;
