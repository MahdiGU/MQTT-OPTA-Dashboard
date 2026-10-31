# Phase 2 Verification Results

Verification date: 2026-10-31

## Automated database test

The complete migration and ingestion calls were executed inside a transaction and rolled back before live deployment.

| Test | Expected | Result |
| --- | --- | --- |
| First frame `(boot, seq 2)` | History inserted and latest updated | Pass |
| Identical duplicate | No second history row and no state regression | Pass |
| Delayed `(boot, seq 1)` with older source time | History retained; latest remains seq 2 | Pass |
| Five-minute materialization | One correct aggregate per source-time bucket | Pass |
| Migration transaction | No SQL/type error | Pass |

The final observed latest test state was sequence 2, temperature 31.5 C and capture time 14:05 UTC. The delayed sequence 1 frame appeared only in the older 14:00 aggregate.

## Live deployment result

- Migration `phase2_replay_safe_ingestion`: applied successfully.
- `ingest-mqtt` Edge Function: deployed as active version 7.
- Real OPTA frame accepted: sequence 128, schema 2, firmware `4.0.0-phase1`.
- Registered envelope identity: `opta-control-01` in `house-01`.
- Phase 2 history row and five-minute aggregate: created.
- Current diagnostic: `identity_mismatch = true`, expected until the Phase 2 firmware configuration is reflashed.
- `captured_at` on the observed live frame: null, so receipt time was used. Installed-controller NTP synchronization still needs verification.

## Post-deployment advisory review

Supabase reported no new RLS or ingestion-function security finding. The two existing warnings concern the authenticated production entry/delete `SECURITY DEFINER` functions, whose role rules require a separate authorization review, and leaked-password protection remains disabled. Performance information lists four pre-existing unindexed user-reference foreign keys. Newly created indexes are also reported as unused immediately after creation, which is expected until representative queries accumulate statistics.

## Required field tests

1. Reflash the Phase 2 identity configuration.
2. Confirm the live payload identity mismatch becomes false.
3. Confirm `captured_at` is populated after NTP synchronization.
4. Disconnect Wi-Fi long enough to queue multiple frames.
5. Restore connectivity and verify oldest-first replay, unique history rows and no latest-state regression.
6. Simulate a five-minute silence and verify the planned server-side offline evaluator.

## NTP investigation started

The latest identity-correct live frame was inspected in Supabase. It contained `captured_at: null` in the original `raw_payload` at device uptime 178 seconds, proving that the Edge Function did not discard a valid timestamp: the firmware had not acquired one.

Firmware `4.0.1-phase2-ntpdiag` adds event-based serial diagnostics and fixes a plausible UDP lifecycle failure: the earlier implementation retained its UDP-started state across Wi-Fi loss and did not explicitly close a partially opened socket after a failed bind. The diagnostic build closes and recreates the socket, resolves the NTP hostname explicitly, and reports send, timeout, malformed response, invalid timestamp and synchronization outcomes. It compiles successfully for `arduino:mbed_opta:opta` using Arduino mbed Opta core 4.6.0.

Field evidence is still required. Upload the diagnostic build and retain the first serial lines prefixed with `NTP:`.
