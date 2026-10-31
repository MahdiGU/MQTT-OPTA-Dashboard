# Opta MQTT Control v3.3

This folder contains the latest Arduino Opta sketch supplied for the ElMAJD Automation pilot on 2026-10-31.

## Provenance

- Supplied filename: `opta_mqtt_control_v3_3.ino`
- Original supplied SHA-256: `17C474734E33C04083A4AFBCF27FBA52C9FCDB580FA8FA8A3EBC2D3A52275694`
- Repository copy: behavior preserved, except field credentials were replaced with `CHANGE_ME` values and the header comment was corrected to match the actual 5-second publish interval.

## Verified build environment

- Arduino CLI: 1.4.1
- Board FQBN: `arduino:mbed_opta:opta`
- Arduino Mbed OS Opta Boards core: 4.6.0
- ArduinoMqttClient: 0.1.8
- Compile result on 2026-10-31: successful
- Program storage: 439,620 bytes of 1,966,080 bytes (22%)
- Dynamic memory: 67,616 bytes of 523,624 bytes (12%)

## Configuration before upload

Set the Wi-Fi SSID/password, MQTT host/user/password/client ID and confirm the three topics. Do not commit populated credentials.

## Known Phase 0 findings

- I1 is correctly treated as analog and publishes `volts`, `temp_c` and `fault`.
- I2-I8 are read digitally.
- Telemetry and ordinary command publications use QoS 0 and retain disabled.
- The status last-will intentionally uses retain enabled.
- The sketch currently publishes every 5 seconds.
- Temperature conversion uses 0-10 V equals -50 to 100 C. The owner confirmed this as the pilot baseline on 2026-10-31; field accuracy will be checked during commissioning.
- The local build is reproducible with the versions recorded above; a commissioned release tag and binary checksum are still required.
- The sketch does not yet implement persistent local buffering, device timestamps, firmware identity fields, scoped farm/house/device identity, command IDs, expiry or explicit acknowledgements.
