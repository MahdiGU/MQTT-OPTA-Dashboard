# Database performance investigation — 04 November 2026

## Findings and confidence

The initial telemetry outage has a confirmed application cause: the five-minute aggregate trigger scanned raw telemetry on each new frame after the Phase 2 index change. The growing raw table made ingestion progressively more expensive. Migration `20261104165740_bound_five_minute_telemetry_lookup.sql` bounded the query to five minutes using an existing index; the estimated plan cost fell from approximately 11022 to 2.67. See the telemetry recovery report for test evidence.

An unnecessary raw-telemetry Realtime stream was another measured contributor. Query Performance attributed 55.2% of execution time to Realtime WAL processing and 26.7% to ingestion in its selected window. These are cumulative elapsed execution figures, **not CPU attribution**. Raw telemetry was removed from the publication; `device_latest` and business events remain published.

The subsequent intermittent service failure is not yet conclusively explained. Raising timeouts and restarting services are recovery attempts, not proof of a permanent correction.

## Owner's screenshot

`Screenshot_20261104-183805.png` shows CPU/compute at 95%, memory at 76% in the card (69% at the selected chart point), disk I/O balance at 84%, and disk storage at 23%. The chart spans 28 October–4 November. It supports CPU pressure at the selected point; it does not identify the responsible process or prove that CPU remained at 95% throughout the incident. The I/O balance is remaining burst budget, not disk utilization. This snapshot does not establish exhausted I/O budget or a full disk.

## Logs before the later failure (UTC)

| Time | Observation |
| --- | --- |
| 18:21:04 | Advisor query took 12.44 seconds |
| 18:21:58 | Query-statistics inspection took 10.68 seconds |
| 18:22:17 | Ingest RPC took 14.53 seconds |
| 18:32:00 / 18:32:39 | Ingest RPC took 14.16 / 20.08 seconds |
| 18:32:56 | Realtime `list_changes` took 14.99 seconds |
| 18:33:39 / 18:34:12 | Schema introspection took 11.67 / 20.07 seconds |
| 18:38:59 | Small `pg_settings` query took 11.30 seconds |
| 18:40:27 | Alarm maintenance took 11.04 seconds |

Auth also returned database-related 500/504 errors. These observations show broad database latency. Slow inspection queries may add load, so repeated advisors, full-table counts and heavy diagnostic queries should be avoided during recovery. The small settings query's latency means optimizing only the command UI cannot explain or cure the server incident.

## Required evidence before declaring the recurrence fixed

1. Once the existing restart completes, capture lightweight query statistics, connection wait events, table update/dead-tuple counters, publication membership and replication-slot lag.
2. Compare minute-level CPU, memory/swap and I/O metrics with ingest latency. Weekly or daily summary values cannot distinguish an ongoing bottleneck from an earlier peak.
3. Identify whether time is spent in ingestion triggers, Realtime, background maintenance, lock waits or platform resource scheduling. Do not label elapsed query time as measured CPU time.
4. Apply only the correction supported by those measurements, then compare under the same one-device load. Confirm fresh telemetry, successful login and command authorization, and stable Realtime with no recurring timeouts.

At the last management check, the full project restart was still `RESTARTING`. Live database profiling and phone command acceptance remain pending. No additional restart or paid compute upgrade should be treated as the root-cause fix.

Official metric reference: https://supabase.com/docs/guides/platform/compute-and-disk
