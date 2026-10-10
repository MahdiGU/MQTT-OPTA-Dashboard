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

## ElMajd Automation Android app

The `Poultry_Demo_Arduino` branch contains the **ElMajd Automation** Android app. It connects to the MQTT broker through secure WebSockets with the broker, client-ID policy, and topics predefined inside the app.

App features include:

- Required username/password login with optional saved credentials and automatic reconnection.
- Compact mobile overview for temperature, three water cisterns, and two alveole silos.
- Android notification when poultry-house temperature exceeds 33 °C.
- Tappable temperature, cistern, and silo cards with a rolling 12-hour chart sampled every five minutes.
- Plain-text MQTT commands published with QoS 0 and retain disabled.

Every push to this branch runs the **Build Android APK** GitHub Actions workflow. Download the `ElMajd-Automation-debug-apk` artifact from the completed workflow run and install `app-debug.apk` on Android 8.0 or newer.

To build locally, open the repository in Android Studio (JDK 17, Android SDK 35) or run `gradle :app:assembleDebug` with Gradle 8.9.

The branch uses a dedicated, public **debug-only** signing certificate so successive demo APKs can update each other. It must never be used to sign a production or Play Store release.

### Background monitoring version

The `Poultry_Demo_Android_Background` branch moves MQTT into an Android foreground service so monitoring continues while the app is minimized, the screen is locked, or the dashboard activity is closed. It includes:

- A persistent **ElMajd monitoring is active** notification with a Stop action.
- Automatic MQTT reconnection with exponential backoff and a stable phone-specific client ID.
- Secure Android Keystore encryption for saved MQTT credentials.
- Automatic restart after device reboot when **Save login and reconnect automatically** is enabled.
- Native SQLite history sampled in five-minute buckets and retained for 12 hours.
- Native temperature alerts above 33 °C with a 30-minute repeat cooldown.
- Native plain-text command publishing on `opta/cmd` with QoS 0 and retain disabled.

Force-stopping the app or using Android's Active apps **Stop** control still disables monitoring until the user opens the app again. Network outages create gaps in local history because no backend is used.

## Security

Do not commit Wi-Fi passwords, MQTT passwords, certificates, or other credentials. Use a unique MQTT client ID for the dashboard so it does not disconnect the Opta client.
