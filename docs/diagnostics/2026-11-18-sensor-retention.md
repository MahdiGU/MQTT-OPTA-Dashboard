# OPTA sensor retention — 7 days raw / 30 days five-minute history

18 November 2026 · project `zlmaombpfdznambrgqiv` · branch `Cloud_Sensor_Retention_7_30_Days` · no merge.

## Approved policy

| Data | Retention | Age field |
| --- | --- | --- |
| Raw OPTA readings (`public.telemetry`) | 7 days | `recorded_at`, the canonical historical measurement timestamp |
| Five-minute latest-value history (`public.telemetry_five_minute`) | 30 days | Retained sample's `last_recorded_at`, falling back to `bucket_start` for legacy rows |
| Obsolete current sensor snapshots (`public.device_latest`) | 7 days | `captured_at`, falling back to `received_at` |
| Production, production audit, flock, packaging, commands, alarms and alarm audit | Unchanged | Outside sensor cleanup |

The owner's original request was 30 days for sensor data. Migration `20261118115205_opta_sensor_retention_30_days.sql` installed that policy. Before the initial real cleanup, the owner refined it to 7 days for raw readings and 30 days for five-minute history. Migration `20261118115538_opta_sensor_retention_seven_thirty_days.sql` is the final policy and supersedes the first one.

## Implementation

`private.prune_opta_sensor_history()` uses a fixed rolling UTC cutoff and deletes at most 2,000 rows per target table per farm in one call. It uses the existing farm/time indexes, primary-key deletes, `FOR UPDATE SKIP LOCKED`, and a transaction advisory lock to avoid overlapping maintenance runs. There are no new indexes or per-message retention scans. It is an invoker function with an empty search path; PUBLIC, anonymous and authenticated app roles cannot execute it.

The postgres-owned cron job `elmajd-sensor-retention` runs every 15 minutes (`*/15 * * * *`). The earlier 30-day-named job is removed. Every run advances the cutoff automatically. Older records can remain until the next scheduled run; if a large backlog accumulates, bounded batches drain it across runs. The initial backlog is drained with separate, short calls rather than one large delete transaction.

Exact-cutoff readings are retained. A five-minute bucket crossing the 30-day boundary is retained if its latest measurement remains within the period. Five-minute history between 7 and 30 days remains available after raw readings expire. Sensor cleanup has no incoming cascading foreign keys to production or other business tables, and no DELETE triggers on the target sensor tables.

The locally downloaded CLI was blocked by Windows application control. The connected Supabase tool applied the live migrations and allocated their versions; the repository filenames mirror those authoritative server versions. No executable-policy bypass was attempted.

## Validation

`supabase/tests/opta_sensor_retention.sql` runs in a rollback-only repeatable-read transaction. It tests expired/exact-cutoff/recent raw samples, legacy five-minute samples, the 30-day bucket boundary, preservation of five-minute values aged 7–30 days, obsolete/current snapshots, unchanged production fingerprints and app-role execution denial. Synthetic farms/readings and all test deletions are rolled back; no emails, MQTT commands or device actions are sent.

The raw cleanup EXPLAIN uses `telemetry_farm_time_idx` and `telemetry_pkey` with a nested-loop delete rather than scanning all raw history. The initial raw table contained 306,310 readings, of which 185,376 were already older than seven days at the initial check. The five-minute table contained 5,085 rows and no readings older than 30 days. At that check, production contained 36 rows. Live ingestion continues during cleanup, so sensor counts and the moving cutoff change during maintenance.

### Live completion evidence

- Manual catch-up calls removed 183,455 expired raw readings in 93 short calls (including the final no-op). The scheduled 12:00 UTC pass also succeeded during catch-up; approximately 185,000 expired raw readings were removed overall.
- At 12:00:48 UTC, 120,935 raw readings remained, with zero older than the seven-day cutoff at that verification time. All 5,087 five-minute history rows were retained; none was older than 30 days. The count increased during cleanup because ingestion continued.
- The production count stayed at 36 and the whole-row fingerprint stayed `f047b47b48c5ef08b81752f9571ee34e`, confirming unchanged production contents.
- The active postgres-owned cron job is ID 8, `elmajd-sensor-retention`, with schedule `*/15 * * * *`; its owner can execute the function and authenticated app roles cannot. The obsolete 30-day job is absent.
- All synthetic test farms were rolled back. No test fixtures remain.
- PostgreSQL autovacuum completed at 12:01:39 UTC. A subsequent check showed no running vacuum, only 14 estimated dead raw rows, and live OPTA data about two seconds old. A requested ordinary `VACUUM (ANALYZE, SKIP_LOCKED)` did not compete with the active autovacuum; no blocking table rewrite was used.

## Storage effect

Removing expired rows lowers the live-data volume and makes pages reusable after normal PostgreSQL vacuuming. The allocated database/table size may not fall immediately: ordinary DELETE and VACUUM generally reuse space rather than compacting every file. This change deliberately avoids a blocking `VACUUM FULL`, database restart or rebuild of the live telemetry table. The 7/30-day retention bounds future sensor-history growth; it does not change the five-second MQTT publish rate or the five-minute sampling rule.
