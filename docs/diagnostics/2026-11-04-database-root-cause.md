# Database performance investigation — 04 November 2026

## Findings and confidence

The initial telemetry outage has a confirmed application cause: the five-minute aggregate trigger scanned raw telemetry on each new frame after the Phase 2 index change. The growing raw table made ingestion progressively more expensive. Migration `20261104165740_bound_five_minute_telemetry_lookup.sql` bounded the query to five minutes using an existing index; the estimated plan cost fell from approximately 11022 to 2.67. See the telemetry recovery report for test evidence.

An unnecessary raw-telemetry Realtime stream was another measured contributor. Query Performance attributed 55.2% of execution time to Realtime WAL processing and 26.7% to ingestion in its selected window. These are cumulative elapsed execution figures, **not CPU attribution**. Raw telemetry was removed from the publication; `device_latest` and business events remain published.

The subsequent intermittent service failure is not yet conclusively explained. Raising timeouts and restarting services are recovery attempts, not proof of a permanent correction.

## Owner's screenshot

`Screenshot_20261104-183805.png` shows CPU/compute at 95%, memory at 76% in the card (69% at the selected chart point), disk I/O balance at 84%, and disk storage at 23%. The chart spans 28 October–4 November. Subsequent inspection of Supabase Studio's source confirmed that this card displays the **peak CPU over the rolling last seven days**, with daily maximum CPU points. It is not an instantaneous CPU measurement. The header's memory value is also a period peak, while disk I/O balance is the minimum sampled remaining budget. The earlier 95% can therefore remain displayed after the service recovers. This screenshot cannot establish ongoing CPU saturation, exhausted I/O budget or a full disk.

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

## Post-restart observations

The database started at 19:02:34 UTC and the management API reported healthy by 19:03:09. The owner confirmed sign-in works in Android 1.11.2. Auth health returned 200, and the anonymous authorization-RPC probe correctly returned permission denied rather than a schema-cache failure.

At 19:03:20 UTC, the first eight ingestion calls averaged 152.2 ms. Realtime's replication slot was active with only 56 bytes retained; there was no connection pile-up or lock wait in the captured activity snapshot.

At 19:04:50 UTC:

- The latest OPTA capture was 19:04:44, received at 19:04:44.818.
- The 26 ingestion calls averaged 68.3 ms, maximum 362.3 ms.
- Realtime polling averaged 16.1 ms across 285 calls, maximum 417.9 ms.
- All 11 other client connections in the snapshot were idle, waiting on their clients.
- Database counters showed zero deadlocks and no temporary-file spill. These counters were reset during recovery and do not describe the pre-restart incident.

Between the two snapshots, 18 additional ingests used approximately 558.3 ms total (31.0 ms/call), and 192 Realtime polls used approximately 1880.2 ms total (9.8 ms/call). These are elapsed database execution times, not direct CPU measurements. They establish initial recovery under the current pilot load, not long-term stability or a conclusive explanation of the later recurrence.

Do not credit the restart as a root-cause correction. The confirmed query-scan defect and unnecessary raw Realtime stream have been corrected; the remaining explanation requires correlated CPU/resource and query-wait evidence if latency returns. No additional restart or paid compute upgrade was selected after the owner's request to prioritize diagnosis. The owner subsequently tested ON/OFF commands at 19:04:55–19:05:00 UTC; command audits and changing OPTA D0/L0 telemetry verified the full path. See the command recovery report for exact evidence.

Official metric reference: https://supabase.com/docs/guides/platform/compute-and-disk

## Follow-up: 95% card after recovery

At 19:31:58 UTC (20:31:58 Europe/Berlin), telemetry capture age was approximately four seconds, with the latest frame received 1.424 seconds after capture. Since the 19:02:34 restart, 353 ingest RPC calls averaged 9.5 ms (maximum 362.3 ms). The snapshot showed 12 other client connections idle, waiting for their clients. Realtime polling averaged 6.7 ms across 3815 calls. These are database timings and wait states, not host CPU measurements, but do not show recurrence of the earlier broad slowdown.

Verified the card's definition in Supabase's official source: `ComputeAndDiskUsageCharts.tsx` requests `max_cpu_usage` over a rolling seven-day window at interval `1d`; `getComputeUsageSummary` takes the maximum of those CPU points. Consequently, its unchanged 95% header is not evidence of a new or continuing 95% CPU incident. Use the Observability database CPU chart over a short recent window to assess present CPU load.

Source: https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/DiskManagement/ComputeAndDiskUsageCharts.tsx

Aggregation: https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/DiskManagement/ComputeAndDiskUsageCharts.utils.ts
