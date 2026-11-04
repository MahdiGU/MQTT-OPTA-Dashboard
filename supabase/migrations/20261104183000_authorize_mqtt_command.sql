-- Validate a user command through PostgREST's verified JWT and farm membership.
-- This removes a separate Auth /user network call from every command request.
create or replace function public.authorize_mqtt_command(target_farm_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requested_by uuid := auth.uid();
  allowed_farm uuid;
  allowed_role text;
begin
  if requested_by is null then
    return jsonb_build_object('allowed', false);
  end if;

  select f.id, m.role
    into allowed_farm, allowed_role
  from public.farms f
  join public.farm_members m on m.farm_id = f.id
  where f.slug = target_farm_slug
    and m.user_id = requested_by
    and m.role in ('owner', 'manager');

  if not found then
    return jsonb_build_object('allowed', false);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'farm_id', allowed_farm,
    'user_id', requested_by,
    'role', allowed_role
  );
end
$$;

revoke all on function public.authorize_mqtt_command(text) from public, anon;
grant execute on function public.authorize_mqtt_command(text) to authenticated;

notify pgrst, 'reload schema';
