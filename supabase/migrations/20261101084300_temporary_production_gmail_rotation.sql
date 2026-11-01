-- Temporary service-only wrapper, retired by the following migration.
create or replace function public.replace_pilot_gmail_credential(credential jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
  if jsonb_typeof(credential) is distinct from 'object' or credential->>'sender_email' is distinct from 'elmajdautomation@gmail.com'
    or nullif(credential->>'client_id','') is null or nullif(credential->>'client_secret','') is null
    or nullif(credential->>'refresh_token','') is null then raise exception 'Invalid mail credential';end if;
  perform pg_advisory_xact_lock(81433121);
  select id into target_id from vault.secrets where name='elmajd_gmail_oauth';
  if not found then raise exception 'Existing mail credential is required';end if;
  perform vault.update_secret(target_id,credential::text,'elmajd_gmail_oauth','ElMAJD Gmail sender - Production authorization');
end $$;
revoke all on function public.replace_pilot_gmail_credential(jsonb) from public,anon,authenticated;
grant execute on function public.replace_pilot_gmail_credential(jsonb) to service_role;
