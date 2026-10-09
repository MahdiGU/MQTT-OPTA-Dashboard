# MQTT OPTA Dashboard

A browser-based dashboard for monitoring and controlling an Arduino Opta over MQTT.

## MQTT protocol

- Telemetry: `opta/outputs` — JSON containing sequence, uptime, RSSI, relay outputs, status LEDs, the IO1 lamp sensor, and digital inputs I2–I8.
- Device status: `opta/status` — retained `online` or `offline` text.
- Commands: `opta/cmd` — plain-text commands such as `D0 ON`, `LED2 OFF`, `D1 TOGGLE`, or `ALL OFF`.
- Commands are published with QoS 0 and `retain: false`.

The browser connects through MQTT over secure WebSockets (`wss://...:8084/mqtt`). Enter the broker username and password in the dashboard; passwords are not stored.

The IO1 analog lamp sensor is expected in the telemetry payload as:

```json
"inputs": {
  "I1": { "voltage": 12.6, "temperature": 42.4 },
  "I2": 0,
  "I3": 0,
  "I4": 0,
  "I5": 0,
  "I6": 0,
  "I7": 0,
  "I8": 0
}
```

For compatibility, a numeric `I1` value is displayed as voltage with temperature unavailable. The aliases `voltage_v`, `temperature_c`, and `temp_c` are also accepted.

## Run locally

Serve the `dist` directory with any static web server, then open the local URL in a browser.

The production dashboard is a static site. Its source is contained in `dist/index.html`.

## Security

Do not commit Wi-Fi passwords, MQTT passwords, certificates, or other credentials. Use a unique MQTT client ID for the dashboard so it does not disconnect the Opta client.
