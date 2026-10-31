# Phase 3 Verification

Date: 2026-10-31

## Deployed

- `phase3_alarm_engine`: applied to the pilot Supabase project.
- `phase3_alarm_queue_hardening`: applied.
- Cron `elmajd-alarm-maintenance`: active, every minute.
- First observed scheduled run: succeeded at 13:55 UTC in about 13 ms.
- Warning/critical defaults: 30/33 C.
- `alarm_events`: published for authenticated Realtime reads.

## Transactional simulation

Run `supabase/tests/phase3_alarm_engine.sql` after the migrations. The file contains its own BEGIN/ROLLBACK and leaves no simulated data behind. It temporarily uses the pilot registry, drives unique simulated telemetry through the real ingestion RPC and asserts:

- no critical/cooling event before the two-minute delay;
- critical and cooling activation at two minutes;
- all eight expected temperature/level/cooling events after five minutes;
- push queue creation;
- acknowledgement idempotency and pending-delivery cancellation;
- replay exclusion from alarm state and fresh-device heartbeat;
- offline activation after five minutes without fresh samples;
- critical email escalation after ten minutes and suppression after acknowledgement;
- temperature/level/cooling/offline recovery;
- sensor fault activation and recovery after exactly two consecutive samples;
- threshold change auditing;
- cross-farm and anonymous denial for acknowledgement/configuration;
- denied client execution of internal maintenance.

Result: PASS. The migration itself also passed a rolled-back deployment test before live application.

## Advisory review

The database advisor identified a missing state-to-event foreign-key index; the hardening migration adds it. Private state tables use explicit service-role-only policies. Authenticated SECURITY DEFINER advisories on acknowledgement/configuration are intentional and were reviewed: both require auth.uid() plus membership/role checks and use an empty search path. Existing production RPC and password-protection warnings remain separate items for the broader security review.

## Not yet verified

No FCM or Gmail message has been sent by this engine. No closed-app phone test has been performed. Provider authorization, actual retries/token expiry, Android alarm UI and two-user delivery are pending. Automated server simulations do not replace the field acceptance test.
