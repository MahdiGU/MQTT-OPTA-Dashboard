# Phase 1 Task Reports

Report date: 2026-10-31

## Refactor Opta firmware into sensor, MQTT, buffer and diagnostics modules

Implemented a v4.0 Phase 1 project derived from v3.3. Source is separated into configuration, stable types, I/O, time synchronization, telemetry buffer, JSON codec and main network/command orchestration. The project compiles successfully for the Opta. Software implementation complete; device regression test pending.

## Add device timestamps, firmware version, buffer state and scoped identity fields

Implemented schema version, firmware version, farm/house/device identity, boot ID, UTC capture time, replay state, pending count and dropped count. `captured_at` remains null until non-blocking NTP synchronization succeeds. Software implementation complete; live NTP and ingestion compatibility tests pending.

## Implement local buffering and replay-safe sequence behavior

Implemented a 120-frame RAM ring buffer. Sequences are assigned at capture, frames drain oldest first, failed publishes remain queued, overflow drops oldest with a counter, and device/boot/sequence forms the idempotency key. RAM buffering does not survive power loss; persistent flash buffering remains a design decision because endurance and recovery behavior require approval. Task remains in progress pending outage/replay tests.

## Calibrate PT100 0-10 V chain and document transfer function

Encoded the approved 0-10 V = -50 to 100 C baseline and documented formula/test points. The field comparison record is ready. Task remains in progress until installed-hardware readings are compared with a trusted reference.

## Validate I2-I7 mapping and pilot fan control-status semantics

Implemented I2-I6 as binary PNP/NO level inputs and I7 as cooling auxiliary feedback. I8 remains reserved. D0-D3/LED values are explicitly documented as command/control status only. Task remains in progress until individual field inputs are stimulated and recorded.

## Finalize terminal schedule and conceptual wiring update

Created the logical I/O and draft terminal schedule. Physical terminal numbers, supply/protection, common, shield, relay load and grounding details remain pending because the cabinet is not yet finalized.

## MILESTONE M1 - Field telemetry baseline accepted

Not yet achieved. The firmware build and documentation baseline are ready, but device outage/replay, NTP, input stimulation, PT100 comparison and final terminal/schematic evidence are still required.
