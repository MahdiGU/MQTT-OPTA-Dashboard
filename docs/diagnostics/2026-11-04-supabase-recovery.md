# Supabase telemetry recovery — 04 November 2026

## Incident and cause

The Android 1.10 status was delayed/offline because cloud telemetry writes stopped after 10:33:05 UTC. The MQTT webhook still reached `ingest-mqtt`, but its database RPC timed out in `private.refresh_telemetry_five_minute_bucket()`. Phase 2 allowed multiple raw records per five-minute bucket and removed the old general bucket index. The remaining bucket index covers legacy records only, so current frames caused a sequential scan of raw telemetry on every insert.

The database/API pressure also caused Realtime subscription timeouts. During recovery, PostgREST could not rebuild its schema cache under the `authenticator` role's eight-second `statement_timeout`, producing HTTP 503 / `PGRST002`. The Edge Function's “Configured farm was not found” message was caused by that API failure; the farm record was still present.

## Applied fixes

1. Live migration `20261104165740_bound_five_minute_telemetry_lookup` adds source-time bounds to the bucket refresh query. `recorded_at` and `ingest_bucket` both derive from the same source timestamp, so the existing `telemetry_device_time_idx` can restrict the scan to one five-minute interval. The aggregate plan changed from a raw-table sequential scan (estimated cost about 11022) to an index scan (estimated cost about 2.67). No raw records, RLS policies, business records, or device commands were changed.
2. Live migration `20261104171110_allow_postgrest_schema_cache_recovery` changes the `authenticator` role's statement timeout from 8 to 30 seconds and requests PostgREST config/schema reload. This is a persistent Data API timeout setting. Monitor it if future API requests become slow; the query fix remains necessary independently.
3. A proposed general bucket-index build was cancelled before completion because it was taking too long on the live system. That index is **not** installed or part of the migrations. The bounded query uses an existing index.

## Verification

- An isolated, rolled-back SQL fixture passed legacy rows, bucket boundaries, out-of-order replay, null temperature, receipt-time fallback, and duplicate suppression (`supabase/tests/telemetry_bucket_bounds.sql`).
- At 17:25:40 UTC, `device_latest` held sequence 71768, captured at 17:25:34 and received at 17:25:35.338: about six seconds old. The two newest five-minute buckets were advancing; the completed 17:15 bucket held 60 samples.
- From 17:20 UTC through the last checked log window, `ingest-mqtt` returned 67 HTTP 200 responses and no non-200 responses; three alarm-dispatch calls returned 200. The same window had no PostgREST schema-cache or Realtime timeout errors.
- An anonymous WebSocket subscription handshake received `phx_reply: ok`. This confirms the Realtime service accepts a subscription but does not prove authenticated Android event delivery or RLS behavior. That requires a phone check.

## Remaining limitations

The five-minute aggregate has a gap between the 10:30 and 16:40 UTC buckets, plus shorter gaps during recovery. The missing samples were not stored by Supabase. Whether they can be recovered depends on retained MQTT/device data; this fix cannot reconstruct them from the database.

On Android 1.10, close and reopen the app after the backend recovery and verify a fresh temperature timestamp, Realtime subscribed, and current production data. If a device remains stuck on “waiting for subscription,” capture its screen and time: app 1.10 has a separate subscription-watchdog/reconciliation weakness identified in the investigation. No Android package was changed in this backend fix.
