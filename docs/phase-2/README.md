# Phase 2 - Cloud Ingestion and Durable Telemetry

Branch: `Phase_2_Cloud_Ingestion`  
Started: 2026-10-31  
Base: `Phase_1_Opta_Firmware`

## Current result

The first Phase 2 cloud slice is deployed. Supabase now registers the pilot house and Opta controller, validates the MQTT client and topic, stores replayed firmware frames idempotently, preserves device capture time, prevents delayed frames from replacing the current state, and maintains five-minute aggregates for application charts.

The live EMQX webhook accepted firmware `4.0.0-phase1` after deployment. The currently flashed controller still emits the former payload identity (`farm-pilot-01` / `opta-01`), so those frames are accepted but marked `identity_mismatch`. The Phase 2 configuration uses `elmajd-poultry` / `opta-control-01`; reflashing it will remove that diagnostic flag.

## Documents

- [Cloud ingestion architecture and data contract](01-cloud-ingestion-architecture.md)
- [Verification plan and live results](02-verification-results.md)
- [Phase 2 task reports](03-phase-2-task-reports.md)

## Remaining Phase 2 work

- run the physical disconnect/reconnect and buffered replay test;
- confirm NTP produces a valid `captured_at` value on the installed controller;
- schedule authoritative five-minute controller-offline evaluation;
- implement alarm-event and audit persistence on top of validated telemetry;
- approve retention, backup and restore requirements;
- reflash the aligned identity configuration and close the mismatch diagnostic;
- complete the security/performance advisory review before milestone M2.
