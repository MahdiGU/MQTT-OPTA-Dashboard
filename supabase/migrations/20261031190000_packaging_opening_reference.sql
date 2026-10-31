-- The earliest dated carton receipt is the opening stock reference.
create function public.calculate_carton_inventory(target_farm uuid)
returns table(received bigint,consumed bigint,balance bigint,reference_date date,shortfall bigint)
language plpgsql stable security invoker set search_path='' as $$
declare day_entry record;
begin
  received:=0;consumed:=0;balance:=0;shortfall:=0;
  select min(receipt_date) into reference_date from public.carton_receipts where farm_id=target_farm;
  if reference_date is null then return next; return; end if;
  for day_entry in
    select movement_day,sum(incoming)::bigint incoming,sum(used)::bigint used from (
      select receipt_date as movement_day,quantity::bigint incoming,0::bigint used from public.carton_receipts where farm_id=target_farm
      union all
      select production_date,0::bigint,cartons_used::bigint from public.daily_production
        where farm_id=target_farm and production_date>reference_date
    ) movement group by movement_day order by movement_day
  loop
    received:=received+day_entry.incoming;consumed:=consumed+day_entry.used;
    shortfall:=shortfall+greatest(day_entry.used-balance-day_entry.incoming,0);
    balance:=greatest(balance+day_entry.incoming-day_entry.used,0);
  end loop;
  return next;
end $$;
revoke all on function public.calculate_carton_inventory(uuid) from public,anon;
grant execute on function public.calculate_carton_inventory(uuid) to authenticated,service_role;
create or replace view public.carton_balance with(security_invoker=true) as
select f.id farm_id,c.received,c.consumed,c.balance,c.reference_date,c.shortfall
from public.farms f cross join lateral public.calculate_carton_inventory(f.id) c;

create function public.edit_carton_receipt(target_farm uuid,receipt_id uuid,target_date date,carton_count integer,receipt_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner','manager']) then raise exception 'Carton adjustment permission denied' using errcode='42501'; end if;
  if target_date is null or target_date>(now() at time zone 'Etc/GMT-1')::date or carton_count is null or carton_count<=0 then raise exception 'Enter a valid receipt date and positive whole carton count.'; end if;
  update public.carton_receipts set receipt_date=target_date,quantity=carton_count,note=coalesce(receipt_note,'')
    where id=receipt_id and farm_id=target_farm;
  if not found then raise exception 'Carton entry not found'; end if;
end $$;
create function public.delete_carton_receipt(target_farm uuid,receipt_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_farm_role(target_farm,array['owner']) then raise exception 'Only the owner/admin may delete carton entries' using errcode='42501'; end if;
  delete from public.carton_receipts where id=receipt_id and farm_id=target_farm;
  if not found then raise exception 'Carton entry not found'; end if;
end $$;
revoke all on function public.edit_carton_receipt(uuid,uuid,date,integer,text),public.delete_carton_receipt(uuid,uuid) from public,anon;
grant execute on function public.edit_carton_receipt(uuid,uuid,date,integer,text),public.delete_carton_receipt(uuid,uuid) to authenticated;
drop trigger carton_receipt_audit on public.carton_receipts;
create trigger carton_receipt_audit after insert or update or delete on public.carton_receipts for each row execute function private.audit_production_change();
