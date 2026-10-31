# Phase 2 Task Reports

Report date: 2026-10-31

## Register pilot farm, house, controller and scoped topics

Created the pilot poultry-house registry and registered `opta-control-01` with explicit telemetry, status and command topics. Updated the Phase 2 firmware configuration to use the same farm/device identity. Cloud implementation complete; controller reflash pending.

## Harden MQTT webhook validation

The webhook now requires the protected EMQX secret, a known enabled MQTT client, and the topic registered to that device. Telemetry and device status are written through service-only database functions. Null sensor values are no longer silently converted to zero. Implemented and deployed as Edge Function version 7.

## Implement replay-safe raw telemetry ingestion

Added firmware schema/version, boot ID, source time, replay/buffer diagnostics, house identity and LED fields. Unique device/boot/sequence storage and conditional latest-state updates were validated with duplicate and delayed-frame tests. Implemented and deployed.

## Build five-minute telemetry aggregates

Added chart-ready five-minute source-time buckets derived from accepted raw history. Aggregate refresh and RLS member reads are implemented. Live application cutover to this table remains a later client task.

## Establish authoritative offline and recovery evaluation

Not complete. Registry `last_seen_at` is now maintained, providing the required source. A scheduled server-side evaluator and alarm event lifecycle still need implementation and timed validation.

## Add alarm/audit persistence

Not started in this slice. It depends on the approved Phase 0 alarm matrix and the authoritative freshness evaluator. Existing command audit behavior is preserved.

## Approve retention, backup and restore controls

Not complete. Retention duration, raw-versus-aggregate policy, recovery objective, backup frequency and restore-test evidence require owner approval before destructive retention jobs are introduced.

## MILESTONE M2 - Durable cloud ingestion accepted

In progress. The deployed ingestion baseline passes software and live-message smoke tests. M2 remains open for physical outage/replay, NTP, identity reflash, offline/alarm scheduling, advisory closure and backup/restore evidence.
