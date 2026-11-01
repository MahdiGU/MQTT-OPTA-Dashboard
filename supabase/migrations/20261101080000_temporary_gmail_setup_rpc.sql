-- Temporary, service-only import wrapper used for the authorized deployment.
-- Retired by the following migration; no credential values are in this file.
create function public.install_pilot_gmail_credential(credential jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if jsonb_typeof(credential)<>'object' or credential->>'sender_email'<>'elmajdautomation@gmail.com'
    or nullif(credential->>'client_id','') is null or nullif(credential->>'client_secret','') is null
    or nullif(credential->>'refresh_token','') is null then raise exception 'Invalid mail credential';end if;
  perform pg_advisory_xact_lock(81433121);
  if exists(select 1 from vault.secrets where name='elmajd_gmail_oauth') then raise exception 'Mail credential already installed';end if;
  perform vault.create_secret(credential::text,'elmajd_gmail_oauth','ElMAJD authorized Gmail sender');
end $$;
revoke all on function public.install_pilot_gmail_credential(jsonb) from public,anon,authenticated;
grant execute on function public.install_pilot_gmail_credential(jsonb) to service_role;
