# ElMAJD FLOW web dashboard

Browser conversion of Android FLOW 1.16.0, developed on `Web_FLOW_Dashboard` on 18 November 2026. No merge. The Android application and firmware remain unchanged.

The web dashboard reuses the APK's local UI assets, 3D engine, I/O adapter, charts, production forms, validation and role-aware controls. A browser adapter replaces the Java bridge with the pinned Supabase JS SDK 2.119.0. Desktop users get a sidebar and multi-column workspace; smaller screens retain the five bottom tabs and header access to Configuration/Communication. French/English and the new FLOW branding are retained.

## Use

Sign in with the **same Supabase email and password as the Android app**. The pilot farm is `elmajd-poultry`. The browser reads/writes the existing shared data, rather than a separate database. Farm membership and permissions are enforced by RLS and the existing authenticated RPCs. Remembering login saves a refreshable session in this browser, never the raw password. Unchecked login uses session storage. Sign-out stops subscriptions and clears the session and displayed account data.

The default published Site is owner-private. Its access gate is separate from the Supabase farm login; sharing the Site with other visitors is a separate access decision.

## Features

- Live temperature, voltage and device diagnostics; three cisterns, two silos, eight fan command states, twelve feeding-chain feedback states and two pads sharing I7.
- Interactive architectural house and locally bundled rotatable WebGL scene; silo fill, OFF fan shutters, blue pads and egg-depot stock/capacity retain the app's mappings and freshness rules.
- Latest production, flock, carton stock, daily/weekly production and mortality, plus 12-hour latest-value five-minute equipment history.
- Server-validated Stock/Sortie/mortality entry and production calculation; history paging, authorized edits/deletion, flock adjustments, carton receipts and corrections.
- Shared alarms/acknowledgement, temperature thresholds, password change/recovery and authenticated pilot commands. A notification test sends to the user's already registered Android phone; email self-tests use the existing Gmail sender.

Realtime subscriptions are filtered by farm and cover current device state, production, alarms, carton receipts and flock adjustments. The dashboard reconciles business/history data every five minutes while visible. A bounded 15-second REST fallback checks current telemetry only when Realtime is unavailable or silent for over 25 seconds. Reads are deduplicated; hidden tabs suspend these periodic reads and reconcile when visible again. It does not fetch raw telemetry or run any historical aggregation.

Browser monitoring requires an open tab; a browser/OS may throttle or suspend a background tab. This web release does not register browser push or provide Android-style background monitoring. Existing server alarms, Gmail fallback and Android push continue independently.

## Backend adaptation

The new `web-dashboard-api` Edge Function provides browser CORS support for the existing command, account-recovery and notification-self-test endpoints. It accepts only three fixed operations and does not accept a target URL, MQTT credentials, worker secrets or arbitrary headers. Commands and tests forward the user's JWT to the existing authorization checks. Recovery retains the existing non-enumerating, rate-limited recovery service. The platform JWT precheck is disabled for this gateway to allow public recovery; protected operations require a bearer JWT and are independently authorized by their existing target functions. Existing Edge Functions, tables, policies and firmware are not modified.

Commands remain plain text (`D0 ON`, `LED2 OFF`, `ALL OFF`, etc.), with server-enforced **QoS 0 and retain off**. The JSON gateway envelope transports the string over HTTPS; it does not change the MQTT payload format. Browser configuration includes only the public URL, publishable key and farm slug. No service-role key, MQTT password or signing key is bundled.

## Build and test

```powershell
pnpm install --frozen-lockfile
pnpm build:web
pnpm test:web
pnpm preview:web
```

The preview runs at `http://127.0.0.1:4180/`. `web/dist` is the deployable static dashboard and is ignored by Git. The build copies an explicit allowlist from the Android assets and adds the browser adapter/layout; it includes fonts, building/model assets and third-party licenses. The `?preview` parameter does not bypass sign-in or create demo data in the web build.

Automated browser tests use mocked HTTP and WebSocket responses through the actual browser bridge/Supabase SDK. They verify login, password-free session storage/restore/logout, farm-scoped reads, live channel updates, numeric/RPC mapping, production save and plain-string command requests, 390/768/1440 layouts and gateway restrictions. No test publishes an actual OPTA command or sends a real email/notification. Live read-only checks verified the project is healthy, the pilot farm exists, CORS preflight succeeds, anonymous command submission receives 401 and anonymous farm data is denied. Physical device control and authenticated real-user field acceptance remain to be checked by the owner.

Static deployment source is staged separately for Sites, containing only the compiled dashboard, hosting manifest and this guide. It excludes Android Java/configuration, firmware, APKs, keystores, temporary files and backend sources.
