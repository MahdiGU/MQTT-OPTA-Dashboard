# Engineering Evidence Register

Review date: 2026-10-31  
Purpose: identify the evidence available for Phase 1 and record what must still be supplied.

## 1. Evidence inventory

| Evidence | Available result | Status | Required action |
|---|---|---|---|
| System specification | v0.3 PDF, 17 pages, dated 2026-10-31 | Available | Use as the Phase 0 requirements source. |
| Application repository | `Android_Supabase_Realtime`, commit `4caf1df` | Available | Preserve commit reference in test reports. |
| Android application | Version 1.8.4; compile/target SDK 35; minimum SDK 26; Java 17; OkHttp 4.12.0 | Available | Production signing and secret handling still require release hardening. |
| Supabase database | Migration files for shared storage, production dashboard and MQTT cloud bridge | Available | Validate deployed migration state and RLS tests in later phases. |
| Supabase Edge Functions | MQTT ingestion and command-delivery sources are present in the repository | Available | Verify deployed versions, secrets and test coverage later. |
| Arduino sketch | Authoritative `opta_mqtt_control_v3_3.ino` supplied; original SHA-256 recorded; credential-redacted copy added under `firmware/` | Available | Use v3.3 as the Phase 1 source baseline. Preserve the supplied original outside Git and never commit populated credentials. |
| Arduino toolchain and libraries | Arduino CLI 1.4.1; Arduino Mbed OS Opta Boards core 4.6.0; ArduinoMqttClient 0.1.8 | Verified locally | Preserve these versions in the firmware manifest and CI/build instructions. |
| Temperature chain | PT100 through 0-10 V transmitter on I1; firmware assumes -50 to 100 C; owner waived manufacturer/model paperwork | Partially defined | Confirm the installed transmitter's configured range matches the firmware. Treat +/-0.5 C as unverified until a field comparison is recorded. |
| Level sensors | I2-I6 are 24 V PNP/NO capacitive sensors; 1=full, 0=empty | Defined logically | Supply manufacturer/model, terminal numbers, supply/common and installation notes. |
| Cooling feedback | I7 is a 24 V NO auxiliary contact; 1=working | Defined logically | Supply terminal numbers and source equipment/contact rating. |
| Fan feedback | Relay/LED control state only | Known limitation | Select independent running feedback and Opta extension inputs for a later phase. |
| Terminal schedule | Logical I1-I7 assignment is known | Incomplete | Produce final cabinet terminal and cable schedule. |
| Electrical schematic | Concept exists in the specification | Incomplete | A qualified electrical reviewer must produce/approve the installation-ready schematic. |
| Calibration record | Owner considers a formal manufacturer/calibration package unnecessary for the pilot | Waived with limitation | Record at least one basic comparison against a trusted reference before accepting displayed temperature; do not claim verified +/-0.5 C without evidence. |

## 2. Authoritative pilot I/O baseline

| Channel | Signal | Pilot meaning | Validation required |
|---|---|---|---|
| I1 | Analog 0-10 V from PT100 transmitter | Temperature in C and sensor fault state | Confirm at minimum that the transmitter range matches the firmware's -50 to 100 C assumption and perform a basic field comparison. Detailed manufacturer paperwork is waived for the pilot. |
| I2-I6 | 24 V PNP normally-open capacitive sensors | `1` full/material detected; `0` empty/not detected | Confirm sensor-to-terminal mapping and field state for each cistern/silo. |
| I7 | 24 V normally-open auxiliary contact | `1` cooling working; `0` cooling not working | Confirm the contact is isolated and changes with the intended cooling contactor. |
| I8 | Not allocated in the approved pilot definition | Reserved | Do not assign without a change request. |
| D0-D3 and LEDs | Opta relay/LED command state | Command/control status only | Do not label as confirmed equipment operation. |

## 3. Arduino v3.3 assessment

Arduino v3.3 is now the authoritative Phase 1 source baseline. It confirms:

- I1 is sampled as a 12-bit analog input with 16-sample averaging;
- the payload contains `i1.volts`, `i1.temp_c` and `i1.fault`;
- I2-I8 are digital inputs;
- telemetry and command publications use QoS 0 and retain disabled;
- command handling supports D0-D3, LED0-LED3 and ALL with ON/OFF/TOGGLE;
- the actual telemetry interval is 5 seconds.

The following gaps remain:

- the source contains field credentials in its supplied form;
- the supplied file itself does not pin versions, but the verified local build uses Opta core 4.6.0 and ArduinoMqttClient 0.1.8;
- 0-10 V is assumed to map to -50 to 100 C and is not yet supported by transmitter documentation/calibration;
- there is no durable local telemetry buffer or replay contract;
- there is no device timestamp, firmware version or farm/house/device identity in telemetry;
- there is no command ID, explicit device acknowledgement or expiry behavior.

The supplied file's credentials are not reproduced in this baseline or Git. The repository copy uses placeholders. Treat the supplied embedded values as exposed development credentials and rotate them before further pilot deployment.

## 4. Required firmware manifest

The authoritative firmware delivery must include:

- `.ino` source and a repository commit/tag;
- Arduino CLI 1.4.1 and Arduino Mbed OS Opta Boards core 4.6.0;
- ArduinoMqttClient 0.1.8 and any future dependency versions;
- board and expansion model/revision;
- build flags and configured analog mode;
- firmware semantic version included in telemetry;
- checksum of the commissioned binary;
- a redacted configuration template with secrets injected separately;
- command grammar, MQTT topics, QoS and retain rules;
- buffer capacity, overflow and replay behavior;
- calibration constants and source documentation.

## 5. Evidence gap disposition

The v3.3 sketch compiles successfully for `arduino:mbed_opta:opta` with the verified versions. Missing transmitter/calibration and electrical evidence does not block software architecture work, but it blocks M0 hardware acceptance and field commissioning. Each missing item must have a named owner and target date before Phase 1 begins on hardware.
