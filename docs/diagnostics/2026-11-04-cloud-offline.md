# Cloud telemetry and Realtime outage investigation

Investigated 04 November 2026, approximately 17:38-17:45 Europe/Berlin. User reports Android 1.10 showing EMQX Delayed, Realtime Offline and Waiting for subscription. Investigation only: no live schema, broker, provider, permissions, firmware or Android changes were applied.

## Confirmed observations

- Project `zlmaombpfdznambrgqiv` is reported `ACTIVE_HEALTHY`; SQL and HTTP reads remain intermittently accessible. This management status does not establish that ingestion/Realtime are functioning.
- Last committed device sample: capture `2026-11-04T10:33:04Z`, receipt `10:33:05.260Z`, sequence 66818. Local capture time is **11:33:04 Berlin**. Firmware is `4.0.2-phase2-ntpfix`, identity matches, and the last sample is not replayed. Cloud latest and raw history agree.
- EMQX webhook requests continue reaching `ingest-mqtt`. The last-24-hour log aggregation returned 12,725 HTTP 200 and 1,301 HTTP 500 ingestion responses at the time checked. The onset window shows successful writes through 10:33 UTC, then failures. These are request counters, not a loss estimate.
- Ingest failures log `Could not store telemetry`; PostgreSQL logs SQLSTATE `57014`, `canceling statement due to statement timeout`.
- The error context identifies `private.refresh_telemetry_five_minute_bucket()` while inserting/updating `telemetry_five_minute` from raw telemetry. The trigger error aborts the telemetry write transaction, explaining why both history and latest stop advancing.
- Realtime logs show `ErrorOnRpcCall` during `create_subscription`, `IncreaseSubscriptionConnectionPool: Too many database timeouts`, and connection requests dropped after about 10 seconds. HTTP WebSocket upgrade responses are present; an upgrade alone does not confirm a functioning Postgres Changes subscription.
- Database size at inspection: about 133 MB. The telemetry table is about 113 MB with a statistics estimate of 68,337 rows. No storage-quota rejection was observed. CPU, memory and I/O-credit metrics were not captured; no claim is made that a particular resource quota caused the incident.

## Concrete query/index defect

The per-insert aggregate selects raw rows by `farm_id`, `device_id` and `ingest_bucket`. The live index list has no general index covering those three columns. `telemetry_legacy_bucket_unique` covers that tuple only where `boot_id IS NULL`; current schema-2 frames have boot IDs and the aggregate query has no matching partial predicate. The boot/sequence uniqueness index and captured/recorded time indexes do not provide the bucket lookup.

A read-only EXPLAIN of the aggregate's count/min/max/avg filter confirms a **Seq Scan on telemetry**, estimated cost approximately 11022. The actual timeout contexts show the same filtered aggregate query with its additional latest-value arrays. This path grows with all raw history and is exercised on each incoming sample (normally every five seconds). The Phase 2 migration removed the former general unique bucket index when enabling multiple raw frames per bucket, without adding a corresponding nonunique bucket lookup index.

This is a confirmed performance defect and the identified ingestion failure point. Realtime separately confirms database subscription/pool timeouts. The evidence strongly connects both symptoms to database pressure; proving the precise share of resource usage or every concurrent contributor requires resource metrics and post-correction measurement.

## App symptoms and recovery limitations

In 1.10, CloudForegroundService labels the device Delayed when source/receipt age exceeds 20 seconds, overriding the stored broker status. The stored `mqtt_status=online` is an old value, not a live confirmation of the broker connection.

SupabaseRealtimeClient has a connection timeout but no subscription-deadline watchdog and no heartbeat-response deadline. Cloud reconciliation starts after successful subscription on the initial connection path. A channel that never confirms subscription can therefore leave the app waiting without establishing the periodic REST fallback. The sign-in path also clears `signedIn` if a later connection setup operation throws. These are additional resilience issues; they do not explain the server's stopped raw-history writes.

No phone logs were captured, and the report does not attribute a specific Android exception to the user's installation. The reported 1.10 version was compared against its source commit `e086dbe` as well as the current branch.

## Recommended correction and acceptance

1. Add a **nonunique** general lookup index on `public.telemetry (farm_id, device_id, ingest_bucket)`, using a controlled migration/deployment with suitable lock/statement limits. Preserve existing boot/sequence and legacy uniqueness, historical rows, RLS and business data. Do not recreate the old unique index: multiple current-schema samples per five-minute bucket are intentional.
2. Verify the aggregate plan uses the new lookup, measure representative execution, and observe real incoming samples committing and advancing source/receipt time and sequence. Confirm aggregates still match raw rows and duplicates remain suppressed.
3. Recheck database resource/connection pressure, ingestion error rate and authenticated Realtime subscription/event delivery. Increasing pool size or timeouts alone does not remove the full-table scan.
4. Improve app startup/reconnect: bounded subscription wait, acknowledged heartbeat liveness, initial/periodic authenticated REST reconciliation independently of successful subscription, and distinct cloud/session versus stale-device indicators. Do not label stale data as live merely because a socket connects.
5. Validate recovery on the actual phone after backend recovery. The existing 1.11.0 upgrade is required for dated flock configuration, but is not by itself a fix for this outage or these shared Realtime resilience limitations.

Previously committed records remain present. New telemetry during failed transactions has not been stored; recovery depends on actual broker/connector retry retention and cannot be promised from the Opta's RAM buffer alone. Notification worker logs also show timeouts, so alarm delivery must be checked during recovery.

No equipment commands, test telemetry, production edits, user credential changes or project restarts were used in this investigation.
