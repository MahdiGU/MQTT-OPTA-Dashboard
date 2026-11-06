# ElMAJD Opta Firmware 4.0.0 Phase 1

This project evolves the approved v3.3 firmware on the `Phase_1_Opta_Firmware` branch. It does not replace or rewrite the v3.3 baseline.

## Verified build

- Arduino CLI: 1.4.1
- Board: `arduino:mbed_opta:opta`
- Arduino Mbed OS Opta Boards core: 4.6.0
- ArduinoMqttClient: 0.1.8
- Result: successful
- Program storage: 452,980 of 1,966,080 bytes (23%)
- Dynamic memory: 73,192 of 523,624 bytes (13%)

## Modules

| Module | Responsibility |
|---|---|
| `Config.h` | Identity, topics, timing, credentials placeholders and approved PT100 constants |
| `FirmwareTypes.h` | Stable telemetry data structures |
| `IoManager` | I1 analog conversion, I2-I8 digital sampling and relay/LED command state |
| `TimeSync` | Non-blocking NTP synchronization and UTC capture time |
| `TelemetryBuffer` | Bounded oldest-first RAM queue and overflow counter |
| `TelemetryCodec` | Versioned JSON schema and buffer/replay diagnostics |
| main `.ino` | Wi-Fi/MQTT state machine, command parser, capture schedule and queue drain |

## Telemetry contract

Every sample is assigned a sequence when captured, not when published. The cloud idempotency key is:

`device_id + boot_id + seq`

New metadata includes:

- `schema`
- `firmware`
- `farm_id`, `house_id`, `device_id`
- `boot_id`
- `captured_at` as Unix UTC seconds, or `null` before NTP synchronization

## Phase 2 NTP diagnostic build

Firmware `4.0.2-phase2-ntpfix` resets the UDP socket after Wi-Fi loss or a failed initial bind and prints a concise diagnostic for socket creation, DNS resolution, packet transmission, timeout, reply validation and successful synchronization. It also handles the Opta/Mbed `endPacket()` contract correctly: success returns the transmitted byte count rather than necessarily returning `1`.
- `replay`
- `buffer.pending` and `buffer.dropped`

The existing `outputs`, `leds`, `i1` and `inputs` objects remain compatible with the current ingestion path.

## Buffer behavior

- Capacity: 120 samples, equivalent to ten minutes at five-second sampling.
- Capture continues while Wi-Fi or MQTT is unavailable.
- After reconnect, frames drain oldest first with QoS 0 and retain disabled.
- If the queue is full, the oldest frame is discarded and `buffer.dropped` increments.
- A failed publish keeps the frame at the head for the next reconnect.

The current queue is RAM-backed and therefore does not survive a controller power cycle. Persistent flash buffering is deliberately deferred until flash endurance, filesystem choice and corruption recovery are approved.

## Configuration

Populate the Wi-Fi and MQTT placeholders only in a private working copy. Never commit populated credentials. Keep MQTT command publication at QoS 0 with retain disabled.

## Pilot semantics

- I1: PT100 transmitter, 0-10 V = -50 to 100 C.
- I2-I6: 24 V PNP/NO point sensors, `1` full/detected and `0` empty/not detected.
- I7: cooling auxiliary contact, `1` working and `0` not working.
- I8: reserved.
- D0-D3 and L0-L3: command/control state only; they do not prove actual fan rotation.

## AFX00005 feed chain feedback (4.1.0)

Install `Arduino_Opta_Blueprint` **0.2.9** in Arduino IDE Library Manager. The board remains `arduino:mbed_opta:opta`. Keep your site's Wi-Fi, broker and device settings in a private copy of `Config.h`. The sketch reads the AFX00005 (D1608E) immediately to the right of the OPTA, at expansion slot 0.

| Rangée | Étage 1 | Étage 2 | Étage 3 |
| --- | --- | --- | --- |
| 1 | I1 | I2 | I3 |
| 2 | I4 | I5 | I6 |
| 3 | I7 | I8 | I9 |
| 4 | I10 | I11 | I12 |

Use each chain's running feedback with the expansion's specified low-voltage digital input circuit. A high signal is **En marche**. A low signal is **À l’arrêt**. Follow the [Arduino installation and input specifications](https://docs.arduino.cc/resources/datasheets/AFX00005-AFX00006-datasheet.pdf) and verify all 12 signals at the panel before relying on the display.

Telemetry carries the optional integer `feed_chains`. Bit 0 is I1, and bit 11 is I12. A value of zero means all 12 signals are low. A missing expansion or failed bus read sends `null`. Supabase validates the integer and stores it in the existing `telemetry.raw_payload` and `device_latest.raw_payload` fields. The Android app 1.12.0 reads the live value in **État → Chaînes d’aliment**. Older firmware, a failed read and stale telemetry display **Indisponible**. When the controller has no capture time, the server's receipt timestamp for that measurement determines freshness. Chain history is retained in raw telemetry.

Field check after flashing. With the system in its normal safe test state, exercise one feedback input at a time from I1 to I12 and confirm that only the matching row and level changes in the app. Verify the inactive state, then verify that loss of expansion communication shows unavailable.
