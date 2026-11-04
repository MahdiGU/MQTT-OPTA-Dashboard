-- Under current pilot load, PostgREST's schema introspection has exceeded
-- the previous 30-second authenticator timeout after a schema change.
-- The Supabase Data API allows at most 60 seconds for this role setting.
alter role authenticator set statement_timeout to '60s';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
