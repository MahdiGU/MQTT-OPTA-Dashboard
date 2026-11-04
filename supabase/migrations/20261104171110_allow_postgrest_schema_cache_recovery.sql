-- PostgREST could not rebuild its schema cache within the authenticator
-- role's former 8-second statement timeout after the telemetry outage.
-- Keep this below Supabase's 60-second maximum for Data API requests.
alter role authenticator set statement_timeout = '30s';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
