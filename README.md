# MQTT OPTA Dashboard

A browser-based poultry dashboard for monitoring and controlling an Arduino Opta over MQTT.

The `Poultry_Demo` view maps the telemetry inputs as follows:

- `i1.temp_c`: poultry-house temperature.
- `I2`, `I3`, `I4`: independent water cisterns 1, 2, and 3. Each cistern is visually empty for `0` and full for `1`.
- `I5`, `I6`: alveole silo 1 and silo 2. Each silo is visually empty for `0` and full for `1`.
- `I7`, `I8`: accepted in the payload and reserved for future poultry equipment.

## MQTT protocol

- Telemetry: `opta/outputs` — JSON containing sequence, uptime, RSSI, relay outputs, status LEDs, the IO1 lamp sensor, and digital inputs I2–I8.
- Device status: `opta/status` — retained `online` or `offline` text.
- Commands: `opta/cmd` — plain-text commands such as `D0 ON`, `LED2 OFF`, `D1 TOGGLE`, or `ALL OFF`.
- Commands are published with QoS 0 and `retain: false`.

The browser connects through MQTT over secure WebSockets (`wss://...:8084/mqtt`). Enter the broker username and password in the dashboard; passwords are not stored.

The telemetry payload is expected in this format:

```json
{
  "seq": 12,
  "up_s": 345,
  "rssi": -45,
  "outputs": {"D0":0,"D1":1,"D2":0,"D3":0},
  "leds": {"L0":1,"L1":0,"L2":0,"L3":0},
  "i1": {"volts":5.00,"temp_c":25.0,"fault":0},
  "inputs": {"I2":0,"I3":1,"I4":0,"I5":0,"I6":0,"I7":0,"I8":0}
}
```

`i1.fault` must be `0` for normal operation or `1` for a sensor fault. The dashboard highlights the lamp card in red when a fault is reported.

## Run locally

Serve the `dist` directory with any static web server, then open the local URL in a browser.

The production dashboard is a static site. Its source is contained in `dist/index.html`.

## Security

Do not commit Wi-Fi passwords, MQTT passwords, certificates, or other credentials. Use a unique MQTT client ID for the dashboard so it does not disconnect the Opta client.
