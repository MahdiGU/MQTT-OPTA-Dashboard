# MQTT OPTA Dashboard

MQTT monitoring and control dashboards for an Arduino Opta, with both browser and Android versions. The project progressed from a general-purpose I/O dashboard into the **ElMajd Automation** poultry monitoring app.

## Branch guide

| Branch | Type | Purpose and features | Recommended use |
| --- | --- | --- | --- |
| `main` | Web dashboard | General MQTT I/O monitor. Displays relay outputs D0–D3, front-panel LEDs L0–L3, analog input I1, and digital inputs I2–I8. The broker WebSocket and MQTT topics can be configured in the page. Publishes plain-text commands with QoS 0 and retain disabled. | Use as the stable generic Opta web dashboard. |
| `Dashboard_Dev` | Web development baseline | Development branch created from the generic dashboard. It currently points to the same revision as `main`, so there are no functional differences at present. | Use as the baseline for future generic dashboard experiments without changing `main`. |
| `Poultry_Demo` | Poultry web dashboard | Light, responsive poultry-farm presentation. I1 displays voltage and temperature; I2–I4 are animated water cisterns; I5–I6 are animated alveole feed silos. A value of `0` displays an empty vessel and `1` displays a full vessel. | Use for a browser-based poultry demonstration or wall display. |
| `Poultry_Demo_Arduino` | Basic Android app | First **ElMajd Automation** APK. Adds the app icon, username/password login, predefined broker/topics, compact mobile cards, 12-hour charts, controls, and temperature notifications. MQTT still runs in the WebView, so closing the app stops data reception. | Keep as the original Android prototype. For normal installation, use the background branch instead. |
| `Poultry_Demo_Android_Background` | Android app with native background monitoring | Extends `Poultry_Demo_Arduino` with a native foreground MQTT service, automatic reconnection, restart after reboot, encrypted saved credentials, SQLite history, and native high-temperature notifications. Commands remain plain text with QoS 0 and retain disabled. | **Recommended Android branch.** Use when monitoring must continue with the screen locked or the app UI closed. |
| `Poultry_Demo_Supabase` | Android app with shared cloud storage | Extends the background-monitoring app with Supabase authentication, permanent shared production records, five-minute telemetry snapshots, and shared 12-hour charts. MQTT continues to handle live monitoring and commands. | **Recommended multi-phone branch.** Use when several phones must see the same farm history and production data. |

## Branch lineage

```text
main ─────────────── Generic browser dashboard
  └─ Dashboard_Dev  Generic development baseline (currently same revision)
       └─ Poultry_Demo
            └─ Poultry_Demo_Arduino
                 └─ Poultry_Demo_Android_Background
                      └─ Poultry_Demo_Supabase
```

The branches are intentionally separate. No Android or poultry-demo work has been merged into `main`.

## Which branch should I use?

- For a configurable generic web dashboard, use `main`.
- For the light poultry dashboard in a browser, use `Poultry_Demo`.
- For an installable phone app with local-only history, use `Poultry_Demo_Android_Background`.
- For permanent shared data across phones, use `Poultry_Demo_Supabase`.
- Use `Poultry_Demo_Arduino` only when comparing with the original foreground-only prototype.

## MQTT protocol

All current dashboards use this protocol:

- Telemetry topic: `opta/outputs`
- Device-status topic: `opta/status`
- Command topic: `opta/cmd`
- Telemetry and subscriptions: QoS 0
- Commands: plain-text strings such as `D0 ON`, `LED2 OFF`, `D1 TOGGLE`, or `ALL OFF`
- Command publishing: QoS 0 with `retain: false`

The expected telemetry payload is:

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

`i1.fault` is `0` during normal operation and `1` when the analog temperature sensor reports a fault.

## Poultry input mapping

- `i1.temp_c`: poultry-house temperature
- `i1.volts`: analog sensor voltage
- `I2`, `I3`, `I4`: water cisterns 1–3
- `I5`, `I6`: alveole feed silos 1–2
- `I7`, `I8`: accepted and reserved for future equipment

## Running the web versions

Switch to `main` or `Poultry_Demo`, serve the `dist` directory with any static web server, and open it in a browser. The web application is contained in `dist/index.html`.

The browser connects using secure MQTT WebSockets (`wss://...:8084/mqtt`). Broker credentials are entered on the connection screen.

## Building the Android versions

Switch to an Android branch (`Poultry_Demo_Arduino`, `Poultry_Demo_Android_Background`, or `Poultry_Demo_Supabase`), then build with Android Studio using JDK 17 and Android SDK 35. From a configured command line, run:

```text
gradle --no-daemon :app:assembleDebug
```

Pushes to the Android branches run the **Build Android APK** GitHub Actions workflow. Open the successful workflow run, download the `ElMajd-Automation-debug-apk` artifact, extract it, and install `app-debug.apk` on Android 8.0 or newer.

The APK uses a repository-provided debug-only signing certificate so demo updates can be installed over earlier demo versions. This certificate must not be used for a production or Play Store release.

## Background Android behavior

On `Poultry_Demo_Android_Background`, the native Android service owns the MQTT connection instead of the WebView. It provides:

- A persistent **ElMajd monitoring is active** notification with a Stop action
- Exponential MQTT reconnection delays from 3 to 60 seconds
- A stable, phone-specific MQTT client ID
- Android Keystore encryption for saved MQTT credentials
- Optional automatic monitoring after a phone restart
- SQLite samples in five-minute buckets, retained for the most recent 12 hours
- Native alerts above 33 °C with a 30-minute repeat cooldown
- Native publishing to `opta/cmd` with QoS 0 and retain disabled
- A daily form for Stock, Sortie, and mortality, with production and production rate calculated automatically

## Daily production records on the background-only branch

Version 1.3 adds a **Production** tab to the Android app. A valid record contains:

- Production date
- Number of produced eggs
- Mortality count
- Production rate from 0 to 100 percent

The app publishes the record as JSON to `opta/production` with QoS 0 and retain disabled. The payload also contains a phone-specific `device_id` and submission timestamp. Production entries are not written to the phone's SQLite history.

Publishing to MQTT does not by itself create permanent history. Configure the EMQX rule and PostgreSQL table described in [`docs/emqx-production-storage.md`](docs/emqx-production-storage.md) before treating the confirmation in the app as a saved cloud record.

Android force-stop and the system's **Active apps → Stop** action still terminate monitoring until the app is opened again. Network outages leave gaps in local history because this version deliberately uses no external backend.

## Shared Supabase storage

`Poultry_Demo_Supabase` connects the app to the ElMajd Supabase project. The login form keeps cloud and broker authentication separate: enter the Supabase email/password plus three MQTT values—the EMQX authentication username (default `OPTAMG888`), its MQTT password, and an editable MQTT protocol client ID. A unique client ID is generated as the initial value so two phones do not disconnect one another. The broker address and topics remain predefined.

After login, Row Level Security limits access to farms assigned to that Supabase user. Version 1.5 adds transactional flock and production management. The app:

- saves one telemetry snapshot per five-minute bucket in `telemetry`;
- reads the shared last 12 hours for the temperature, cistern, and silo plots;
- stores the shared actual chicken count in `flock_settings`;
- accepts daily Stock, Sortie, and mortality values instead of a manual production value;
- calculates production as `current Stock + Sortie - previous Stock`;
- deducts mortality from the flock and calculates production percentage automatically when a daily record is saved;
- deletes production records through a protected database function and restores their deducted mortality;
- charts production percentage and mortality for the latest seven days;
- loads the latest shared production records on every authorized phone;
- keeps MQTT command publishing at QoS 0 with retain disabled.

The database schema and security policies are versioned in [`supabase/migrations/20261024000000_elmajd_shared_storage.sql`](supabase/migrations/20261024000000_elmajd_shared_storage.sql) and [`supabase/migrations/20261024010000_flock_production_dashboard.sql`](supabase/migrations/20261024010000_flock_production_dashboard.sql). Apply both migrations in order to a new Supabase project before changing the app's project URL or publishable key.

Unlike the preceding background branch, a successful production submission in this branch means Supabase committed the record. MQTT remains responsible for live device data and control, while Supabase provides durable cross-phone history. If the phone is offline, live MQTT and cloud uploads resume only after connectivity returns; this version does not yet queue missed Supabase writes for later replay.

## Security

Do not commit Wi-Fi passwords, MQTT passwords, private certificates, or production signing keys. Give every Opta, browser, and phone a unique MQTT client ID so one connection does not disconnect another.
