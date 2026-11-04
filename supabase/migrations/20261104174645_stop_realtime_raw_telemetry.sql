-- The current Android app subscribes to device_latest and business tables,
-- not raw telemetry. Keep history in Postgres while avoiding Realtime work
-- for each five-second raw insert.
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter publication supabase_realtime drop table public.telemetry;
