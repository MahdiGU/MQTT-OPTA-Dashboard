# Phase 1 Firmware and Field Test Plan

| ID | Test | Expected result | Current status |
|---|---|---|---|
| F1-01 | Compile for `arduino:mbed_opta:opta` | Build succeeds with the pinned Phase 0 toolchain | Passed |
| F1-02 | Inspect repository source for populated secrets | Only placeholders exist in the Phase 1 firmware | Passed by source review |
| F1-03 | Capture telemetry before NTP response | `captured_at=null`; sequence and boot ID remain present | Pending device test |
| F1-04 | Capture after NTP synchronization | `captured_at` contains plausible UTC Unix seconds | Pending device test |
| F1-05 | Disconnect Wi-Fi for five minutes | Samples continue and buffer pending count increases without blocking I/O | Pending device test |
| F1-06 | Reconnect Wi-Fi/MQTT | Frames drain oldest first; replay=1; no retained telemetry | Pending device test |
| F1-07 | Hold outage beyond ten-minute buffer | Oldest frames drop and `buffer.dropped` increases | Pending device test |
| F1-08 | Ingest the same device/boot/sequence twice | Cloud stores one logical history row | Pending Phase 2 idempotency test |
| F1-09 | Restart controller | New boot ID prevents sequence collision | Pending device test |
| F1-10 | Apply I2-I6 sensor signals individually | Correct field changes only; 1=full and 0=empty | Pending field test |
| F1-11 | Toggle I7 auxiliary contact | I7 changes only; 1=working and 0=not working | Pending field test |
| F1-12 | Drive PT100 reference points | Conversion follows approved range and error is within target | Pending field test |
| F1-13 | Send allow-listed command with QoS 0/no retain | Correct relay/LED state changes and immediate telemetry is queued | Pending device test |
| F1-14 | Send malformed/oversize command | Command is ignored safely; firmware remains responsive | Pending device test |
| F1-15 | Inspect fan UI/telemetry semantics | Values are labelled command/control status, not confirmed rotation | Passed by contract; UI check later |

## Current cloud compatibility note

The deployed ingestion function reads the existing `seq`, `up_s`, `rssi`, `outputs`, `leds`, `i1` and `inputs` fields and stores the full JSON as `raw_payload`, so the Phase 1 payload remains parse-compatible. It currently timestamps history by receipt time and reduces data to one row per five-minute receipt bucket. Phase 2 must add source-time handling and idempotency on device/boot/sequence before buffered replay can be accepted as complete end-to-end behavior.

## Acceptance evidence

Attach serial logs, broker message captures, database rows, photos of stimulated inputs and the completed PT100 record. Do not include Wi-Fi, MQTT or API secrets in evidence.
